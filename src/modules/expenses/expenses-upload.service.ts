import fs from 'fs';
import path from 'path';

export const uploadAttachmentFile = async (
  file: { originalname: string; mimetype: string; buffer: Buffer; size?: number },
  folder: string = 'expense-receipts'
): Promise<string> => {
  try {
    const uploadDir = path.join(process.cwd(), 'storage', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanBaseName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${cleanBaseName}`;
    const targetFilePath = path.join(uploadDir, fileName);

    fs.writeFileSync(targetFilePath, file.buffer);
    return `/storage/${folder}/${fileName}`;
  } catch (err: any) {
    // Fallback: return data URI
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
};
