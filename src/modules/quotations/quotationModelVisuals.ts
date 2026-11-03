import http from 'http';
import https from 'https';
import { prisma } from '../../config/database';

/**
 * Fetches a remote image URL and converts it to a base64 data URI for offline embedding in PDFs.
 */
export async function fetchImageAsDataUri(url: string, timeoutMs = 6000): Promise<string> {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return url;

  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https://') ? https : http;
      const req = client.get(url, { timeout: timeoutMs }, (res) => {
        // Follow single redirect if 301/302/307/308
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchImageAsDataUri(res.headers.location, timeoutMs).then(resolve);
          return;
        }

        if (res.statusCode && res.statusCode >= 400) {
          resolve(url);
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const contentType = res.headers['content-type'] || 'image/webp';
          const b64 = Buffer.concat(chunks).toString('base64');
          resolve(`data:${contentType};base64,${b64}`);
        });
        res.on('error', () => resolve(url));
      });

      req.on('error', () => resolve(url));
      req.on('timeout', () => {
        req.destroy();
        resolve(url);
      });
    } catch {
      resolve(url);
    }
  });
}

export interface ModelVisualItem {
  modelName: string;
  category?: string;
  imageUrl: string;
}

/**
 * Resolves model visuals from quote items against database products (cubicles, lockers, urinals).
 * Guarantees that even if customSpecsJson is partially populated or edited, the model visuals
 * and clean model titles are reliably resolved and inline base64 encoded for PDF generation.
 */
export async function resolveQuotationModelImages(
  items: any[],
  catalogProductsOverride?: any[]
): Promise<{
  modelImages: ModelVisualItem[];
  enrichedItems: any[];
}> {
  if (!Array.isArray(items) || items.length === 0) {
    return { modelImages: [], enrichedItems: [] };
  }

  // Load catalog products if not provided
  const catalogProducts = catalogProductsOverride || (await prisma.websiteProduct.findMany().catch(() => []));

  const rawModelImages: Array<{ modelName: string; imageUrl: string; category?: string }> = [];

  const enrichedItems = items.map((it: any) => {
    const desc = String(it.description || it.itemDescription || '').trim();
    const descLower = desc.toLowerCase();
    const customSpecs = typeof it.customSpecsJson === 'object' && it.customSpecsJson !== null ? it.customSpecsJson : {};

    const isLocker = Boolean(
      it.systemCategory === 'locker' ||
      customSpecs.systemCategory === 'locker' ||
      descLower.includes('locker') ||
      descLower.includes('tier') ||
      String(it.unit || '').toLowerCase().includes('tier') ||
      (/^\d+$/.test(String(it.unit || '').trim()) && !descLower.includes('cubicle'))
    );

    const isUrinal = !isLocker && Boolean(
      it.systemCategory === 'ump' ||
      customSpecs.systemCategory === 'ump' ||
      descLower.includes('urinal') ||
      descLower.includes('ump') ||
      descLower.includes('modesty')
    );

    const targetModelId = it.modelId || it.productId;
    const rawModelName = (
      customSpecs.customModelName ||
      customSpecs.modelName ||
      it.customModelName ||
      it.modelName ||
      ''
    ).trim();

    // Match against catalog products
    const matchedProduct = catalogProducts.find((m: any) => {
      const mTitle = String(m.title || '').trim();
      const mTitleLower = mTitle.toLowerCase();
      const mId = String(m.id || '');
      const mSlug = String(m.slug || '');

      // 1. Direct ID or slug match
      if (targetModelId && (mId === targetModelId || mSlug === targetModelId)) {
        return true;
      }

      // 2. Exact or substring model name match
      if (rawModelName) {
        const rawLower = rawModelName.toLowerCase();
        if (mTitleLower === rawLower) return true;
        if (mTitleLower.includes(rawLower) || rawLower.includes(mTitleLower)) return true;
      }

      // 3. Category-scoped description check
      if (isLocker) {
        const isProdLocker = String(m.category || '').toLowerCase().includes('locker');
        if (isProdLocker) {
          if (descLower.includes(mTitleLower) || mTitleLower.includes(descLower)) return true;
        }
      } else if (isUrinal) {
        const isProdUrinal = String(m.category || '').toLowerCase().includes('urinal');
        if (isProdUrinal) {
          if (descLower.includes('model b') && mTitleLower.includes('model b')) return true;
          if (descLower.includes('model a') && mTitleLower.includes('model a')) return true;
          if (descLower.includes(mTitleLower)) return true;
        }
      } else {
        // Cubicle
        const isProdCubicle = !String(m.category || '').toLowerCase().includes('locker') &&
          !String(m.category || '').toLowerCase().includes('urinal');
        if (isProdCubicle) {
          if (descLower.includes(mTitleLower)) return true;
        }
      }

      return false;
    });

    let imgUrl: string =
      it.modelImageUrl ||
      customSpecs.modelImageUrl ||
      customSpecs.imageUrl ||
      matchedProduct?.imageUrl ||
      '';

    let cleanModelName: string =
      matchedProduct?.title ||
      rawModelName;

    if (!cleanModelName && desc) {
      const match = desc.match(/(?:Model|Series|System)[:\s]+([^,\n\r]+)/i);
      if (match) {
        cleanModelName = match[1].trim();
      } else if (desc.length > 30) {
        cleanModelName = desc.split(/[,\n\r\-]/)[0].trim().slice(0, 30);
      } else {
        cleanModelName = desc;
      }
    }

    cleanModelName = (cleanModelName || (isUrinal ? 'Model A' : isLocker ? (matchedProduct?.title || 'Modular Locker') : 'Model Visual'))
      .replace(/^(?:Model\s*Name|System)\s*:\s*/i, '')
      .replace(/[\(\[\{].*?[\)\]\}]/g, '')
      .replace(/^Pacific\s+/i, '')
      .trim();

    if (matchedProduct?.title) {
      cleanModelName = matchedProduct.title;
    }

    // Special handling for Urinal Partitions
    if (isUrinal) {
      const upper = cleanModelName.toUpperCase();
      const isB = upper === 'B' || upper === 'MODEL B' || upper === 'MODE B' || descLower.includes('model b') || descLower.includes('mode b');

      if (!imgUrl) {
        const fallbackUrinalProd = catalogProducts.find((m: any) =>
          String(m.category || '').toLowerCase().includes('urinal') &&
          (isB ? String(m.title).toLowerCase().includes('model b') : String(m.title).toLowerCase().includes('model a'))
        );

        if (fallbackUrinalProd?.imageUrl) {
          imgUrl = fallbackUrinalProd.imageUrl;
        } else if (isB) {
          imgUrl = 'https://ik.imagekit.io/1r254icf2/products/1793431866527_Modern_Gray_Urinal_Privacy_Row_ApCNPoehQo.webp';
        } else {
          imgUrl = 'https://ik.imagekit.io/1r254icf2/products/1791005271878_ChatGPT_Image_Sep_12__2026__12_57_52_PM_QOAy-W7GVp.webp';
        }
      }

      if (isB) {
        cleanModelName = 'Model "B"';
      } else if (upper === 'A' || upper === 'MODEL A' || upper === 'MODE A' || descLower.includes('model a') || descLower.includes('mode a')) {
        cleanModelName = 'Model "A"';
      } else if (upper === 'C' || upper === 'MODEL C' || descLower.includes('model c')) {
        cleanModelName = 'Model "C"';
      } else if (upper === 'D' || upper === 'MODEL D' || descLower.includes('model d')) {
        cleanModelName = 'Model "D"';
      } else if (!cleanModelName.toLowerCase().startsWith('model')) {
        cleanModelName = `Model "${cleanModelName}"`;
      }
    }

    if (imgUrl) {
      rawModelImages.push({
        modelName: cleanModelName,
        imageUrl: imgUrl,
        category: isLocker ? 'Locker' : isUrinal ? 'Urinal' : 'Cubicle',
      });
    }

    return {
      ...it,
      modelImageUrl: imgUrl || undefined,
      customModelName: cleanModelName || it.customModelName || undefined,
      modelName: cleanModelName || it.modelName || undefined,
      customSpecsJson: {
        ...customSpecs,
        customModelName: cleanModelName || customSpecs.customModelName || undefined,
        modelName: cleanModelName || customSpecs.modelName || undefined,
        modelImageUrl: imgUrl || customSpecs.modelImageUrl || undefined,
        systemCategory: isLocker ? 'locker' : isUrinal ? 'ump' : (customSpecs.systemCategory || it.systemCategory || 'cubicle'),
      },
    };
  });

  // Deduplicate model visuals by image URL
  const seenUrls = new Set<string>();
  const uniqueModelImages: ModelVisualItem[] = [];

  for (const img of rawModelImages) {
    if (img.imageUrl && !seenUrls.has(img.imageUrl)) {
      seenUrls.add(img.imageUrl);
      uniqueModelImages.push(img);
    }
  }

  // Convert each unique image to base64 data URI
  const modelImagesWithDataUri = await Promise.all(
    uniqueModelImages.map(async (img) => {
      const dataUri = img.imageUrl.startsWith('data:')
        ? img.imageUrl
        : await fetchImageAsDataUri(img.imageUrl);

      return {
        ...img,
        imageUrl: dataUri || img.imageUrl,
      };
    })
  );

  return {
    modelImages: modelImagesWithDataUri,
    enrichedItems,
  };
}
