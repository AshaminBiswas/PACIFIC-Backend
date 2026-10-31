/**
 * Pacific Restroom Cubicle Enterprise ERP — Authoritative Reporting Period & Timezone Engine (Backend)
 * 
 * Strict business calendar calculations in Asia/Kolkata (IST = UTC+05:30).
 * Supports all 8 standard reporting periods:
 * 1. Daily (Today, Yesterday, Any date)
 * 2. Weekly (Current week, Previous week, Any week)
 * 3. Monthly (Current month, Previous month, Any month)
 * 4. Quarterly (Indian Fiscal Quarters: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar; or Calendar)
 * 5. Half-Yearly (H1 Apr-Sep, H2 Oct-Mar)
 * 6. Yearly (Calendar year)
 * 7. Financial Year (Indian FY: 1 April to 31 March)
 * 8. Custom Date Range (with equivalent or custom prior comparison period)
 */

export type ReportingPeriodType =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'YEARLY'
  | 'FINANCIAL_YEAR'
  | 'CUSTOM';

export type ComparisonMode = 'PREVIOUS_PERIOD' | 'CUSTOM_PREVIOUS' | 'NONE';

export interface ReportingPeriodSelection {
  type: ReportingPeriodType;
  date?: string; // YYYY-MM-DD for DAILY
  week?: string; // YYYY-Www for WEEKLY
  month?: string; // YYYY-MM for MONTHLY
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  quarterYear?: number;
  quarterType?: 'FY' | 'CALENDAR';
  halfYear?: 'H1' | 'H2';
  halfYearFiscalYear?: string; // e.g. "2026-27"
  year?: number; // YYYY for YEARLY
  financialYear?: string; // e.g. "2026-27"
  customStart?: string; // YYYY-MM-DD
  customEnd?: string; // YYYY-MM-DD
  compareCustomStart?: string; // YYYY-MM-DD
  compareCustomEnd?: string; // YYYY-MM-DD
  comparisonMode?: ComparisonMode;
}

export interface SubPeriodBucket {
  key: string;
  label: string;
  startDate: string; // ISO UTC
  endDate: string; // ISO UTC
  startDateLocal: string; // YYYY-MM-DD
  endDateLocal: string; // YYYY-MM-DD
}

export interface ResolvedDateRange {
  periodType: ReportingPeriodType;
  startDate: string; // ISO UTC
  endDate: string; // ISO UTC
  startDateLocal: string; // YYYY-MM-DD
  endDateLocal: string; // YYYY-MM-DD
  label: string;
  subLabel: string;

  previousStartDate?: string;
  previousEndDate?: string;
  previousStartDateLocal?: string;
  previousEndDateLocal?: string;
  comparisonLabel?: string;

  bucket: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  subPeriodBuckets: SubPeriodBucket[];
}

export interface ComparisonResult {
  current: number;
  previous: number;
  absoluteDiff: number;
  percentageChange: number;
  isPositive: boolean;
  isNeutral: boolean;
  formattedChange: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getNowInKolkata(dateObj: Date = new Date()): Date {
  const utcMs = dateObj.getTime() + dateObj.getTimezoneOffset() * 60 * 1000;
  return new Date(utcMs + IST_OFFSET_MS);
}

export function formatLocalKolkataDate(date: Date): string {
  const k = getNowInKolkata(date);
  const y = k.getFullYear();
  const m = String(k.getMonth() + 1).padStart(2, '0');
  const d = String(k.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toKolkataStartOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000+05:30`).toISOString();
}

export function toKolkataEndOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999+05:30`).toISOString();
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d, 10)} ${monthNames[parseInt(m, 10) - 1]} ${y}`;
}

export function getFinancialYearString(date: Date = new Date()): string {
  const k = getNowInKolkata(date);
  const year = k.getFullYear();
  const month = k.getMonth() + 1;
  if (month >= 4) {
    const nextY = String(year + 1).slice(-2);
    return `${year}-${nextY}`;
  } else {
    const prevY = year - 1;
    const currY = String(year).slice(-2);
    return `${prevY}-${currY}`;
  }
}

export function getAvailableFinancialYears(now: Date = new Date(), count: number = 5): string[] {
  const currentFy = getFinancialYearString(now);
  const startYear = parseInt(currentFy.split('-')[0], 10);
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    const y = startYear - i;
    const ny = String(y + 1).slice(-2);
    list.push(`${y}-${ny}`);
  }
  return list;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const ry = dt.getUTCFullYear();
  const rm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const rd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

export function getDaysDifference(startStr: string, endStr: string): number {
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const dt1 = Date.UTC(y1, m1 - 1, d1);
  const dt2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((dt2 - dt1) / (24 * 60 * 60 * 1000)) + 1;
}

export function resolveReportingPeriod(
  selection: ReportingPeriodSelection,
  nowDate: Date = new Date()
): ResolvedDateRange {
  const kolkataNow = getNowInKolkata(nowDate);
  const todayStr = formatLocalKolkataDate(nowDate);
  const comparisonMode = selection.comparisonMode ?? 'PREVIOUS_PERIOD';

  let startDateLocal = todayStr;
  let endDateLocal = todayStr;
  let prevStartDateLocal = addDays(todayStr, -1);
  let prevEndDateLocal = addDays(todayStr, -1);
  let label = 'Today';
  let subLabel = formatDisplayDate(todayStr);
  let comparisonLabel = 'Yesterday';
  let bucket: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY';

  const type = selection.type || 'MONTHLY';

  switch (type) {
    case 'DAILY': {
      const activeDate = selection.date || todayStr;
      startDateLocal = activeDate;
      endDateLocal = activeDate;
      const isToday = activeDate === todayStr;
      const isYesterday = activeDate === addDays(todayStr, -1);
      label = isToday ? 'Today' : isYesterday ? 'Yesterday' : formatDisplayDate(activeDate);
      subLabel = formatDisplayDate(activeDate);

      prevStartDateLocal = addDays(activeDate, -1);
      prevEndDateLocal = addDays(activeDate, -1);
      comparisonLabel = formatDisplayDate(prevStartDateLocal);
      bucket = 'HOURLY';
      break;
    }

    case 'WEEKLY': {
      let baseDateStr = todayStr;
      if (selection.date) baseDateStr = selection.date;
      const [y, m, d] = baseDateStr.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const dayOfWeek = dt.getUTCDay();
      const distanceToMonday = (dayOfWeek + 6) % 7;
      startDateLocal = addDays(baseDateStr, -distanceToMonday);
      endDateLocal = addDays(startDateLocal, 6);

      prevStartDateLocal = addDays(startDateLocal, -7);
      prevEndDateLocal = addDays(endDateLocal, -7);

      const isCurrentWeek = todayStr >= startDateLocal && todayStr <= endDateLocal;
      label = isCurrentWeek ? 'Current Week' : `Week of ${formatDisplayDate(startDateLocal)}`;
      subLabel = `${formatDisplayDate(startDateLocal)} – ${formatDisplayDate(endDateLocal)}`;
      comparisonLabel = `Prev Week (${formatDisplayDate(prevStartDateLocal)} – ${formatDisplayDate(prevEndDateLocal)})`;
      bucket = 'DAILY';
      break;
    }

    case 'MONTHLY': {
      let ym = selection.month;
      if (!ym) {
        ym = `${kolkataNow.getFullYear()}-${String(kolkataNow.getMonth() + 1).padStart(2, '0')}`;
      }
      const [year, month] = ym.split('-').map(Number);
      startDateLocal = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      endDateLocal = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      prevStartDateLocal = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const prevLastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();
      prevEndDateLocal = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`;

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      label = `${monthNames[month - 1]} ${year}`;
      subLabel = `${formatDisplayDate(startDateLocal)} – ${formatDisplayDate(endDateLocal)}`;
      comparisonLabel = `${monthNames[prevMonth - 1]} ${prevYear}`;
      bucket = 'DAILY';
      break;
    }

    case 'QUARTERLY': {
      const qType = selection.quarterType || 'FY';
      const curMonth = kolkataNow.getMonth() + 1;
      const curYear = kolkataNow.getFullYear();

      let activeQuarter = selection.quarter;
      let baseYear = selection.quarterYear;

      if (!activeQuarter) {
        if (qType === 'FY') {
          if (curMonth >= 4 && curMonth <= 6) activeQuarter = 'Q1';
          else if (curMonth >= 7 && curMonth <= 9) activeQuarter = 'Q2';
          else if (curMonth >= 10 && curMonth <= 12) activeQuarter = 'Q3';
          else activeQuarter = 'Q4';
        } else {
          if (curMonth <= 3) activeQuarter = 'Q1';
          else if (curMonth <= 6) activeQuarter = 'Q2';
          else if (curMonth <= 9) activeQuarter = 'Q3';
          else activeQuarter = 'Q4';
        }
      }

      if (!baseYear) {
        if (qType === 'FY') {
          baseYear = curMonth >= 4 ? curYear : curYear - 1;
        } else {
          baseYear = curYear;
        }
      }

      if (qType === 'FY') {
        const nextY = String(baseYear + 1).slice(-2);
        const fyLabel = `FY ${baseYear}-${nextY}`;
        if (activeQuarter === 'Q1') {
          startDateLocal = `${baseYear}-04-01`;
          endDateLocal = `${baseYear}-06-30`;
          label = `Q1 (Apr–Jun) ${fyLabel}`;
          prevStartDateLocal = `${baseYear}-01-01`;
          prevEndDateLocal = `${baseYear}-03-31`;
          comparisonLabel = `Q4 (Jan–Mar) FY ${baseYear - 1}-${String(baseYear).slice(-2)}`;
        } else if (activeQuarter === 'Q2') {
          startDateLocal = `${baseYear}-07-01`;
          endDateLocal = `${baseYear}-09-30`;
          label = `Q2 (Jul–Sep) ${fyLabel}`;
          prevStartDateLocal = `${baseYear}-04-01`;
          prevEndDateLocal = `${baseYear}-06-30`;
          comparisonLabel = `Q1 (Apr–Jun) ${fyLabel}`;
        } else if (activeQuarter === 'Q3') {
          startDateLocal = `${baseYear}-10-01`;
          endDateLocal = `${baseYear}-12-31`;
          label = `Q3 (Oct–Dec) ${fyLabel}`;
          prevStartDateLocal = `${baseYear}-07-01`;
          prevEndDateLocal = `${baseYear}-09-30`;
          comparisonLabel = `Q2 (Jul–Sep) ${fyLabel}`;
        } else {
          startDateLocal = `${baseYear + 1}-01-01`;
          endDateLocal = `${baseYear + 1}-03-31`;
          label = `Q4 (Jan–Mar) ${fyLabel}`;
          prevStartDateLocal = `${baseYear}-10-01`;
          prevEndDateLocal = `${baseYear}-12-31`;
          comparisonLabel = `Q3 (Oct–Dec) ${fyLabel}`;
        }
      } else {
        if (activeQuarter === 'Q1') {
          startDateLocal = `${baseYear}-01-01`;
          endDateLocal = `${baseYear}-03-31`;
          label = `Q1 ${baseYear}`;
          prevStartDateLocal = `${baseYear - 1}-10-01`;
          prevEndDateLocal = `${baseYear - 1}-12-31`;
          comparisonLabel = `Q4 ${baseYear - 1}`;
        } else if (activeQuarter === 'Q2') {
          startDateLocal = `${baseYear}-04-01`;
          endDateLocal = `${baseYear}-06-30`;
          label = `Q2 ${baseYear}`;
          prevStartDateLocal = `${baseYear}-01-01`;
          prevEndDateLocal = `${baseYear}-03-31`;
          comparisonLabel = `Q1 ${baseYear}`;
        } else if (activeQuarter === 'Q3') {
          startDateLocal = `${baseYear}-07-01`;
          endDateLocal = `${baseYear}-09-30`;
          label = `Q3 ${baseYear}`;
          prevStartDateLocal = `${baseYear}-04-01`;
          prevEndDateLocal = `${baseYear}-06-30`;
          comparisonLabel = `Q2 ${baseYear}`;
        } else {
          startDateLocal = `${baseYear}-10-01`;
          endDateLocal = `${baseYear}-12-31`;
          label = `Q4 ${baseYear}`;
          prevStartDateLocal = `${baseYear}-07-01`;
          prevEndDateLocal = `${baseYear}-09-30`;
          comparisonLabel = `Q3 ${baseYear}`;
        }
      }

      subLabel = `${formatDisplayDate(startDateLocal)} – ${formatDisplayDate(endDateLocal)}`;
      bucket = 'MONTHLY';
      break;
    }

    case 'HALF_YEARLY': {
      const curMonth = kolkataNow.getMonth() + 1;
      const curYear = kolkataNow.getFullYear();
      let startYear = curMonth >= 4 ? curYear : curYear - 1;
      let activeHalf = selection.halfYear;

      if (!activeHalf) {
        activeHalf = curMonth >= 4 && curMonth <= 9 ? 'H1' : 'H2';
      }

      if (selection.halfYearFiscalYear) {
        startYear = parseInt(selection.halfYearFiscalYear.split('-')[0], 10);
      }

      const nextY = String(startYear + 1).slice(-2);
      const fyLabel = `FY ${startYear}-${nextY}`;

      if (activeHalf === 'H1') {
        startDateLocal = `${startYear}-04-01`;
        endDateLocal = `${startYear}-09-30`;
        label = `H1 (Apr–Sep) ${fyLabel}`;
        prevStartDateLocal = `${startYear}-10-01`;
        prevEndDateLocal = `${startYear + 1}-03-31`;
        comparisonLabel = `H2 (Oct–Mar) FY ${startYear - 1}-${String(startYear).slice(-2)}`;
      } else {
        startDateLocal = `${startYear}-10-01`;
        endDateLocal = `${startYear + 1}-03-31`;
        label = `H2 (Oct–Mar) ${fyLabel}`;
        prevStartDateLocal = `${startYear}-04-01`;
        prevEndDateLocal = `${startYear}-09-30`;
        comparisonLabel = `H1 (Apr–Sep) ${fyLabel}`;
      }

      subLabel = `${formatDisplayDate(startDateLocal)} – ${formatDisplayDate(endDateLocal)}`;
      bucket = 'MONTHLY';
      break;
    }

    case 'YEARLY': {
      const yr = selection.year || kolkataNow.getFullYear();
      startDateLocal = `${yr}-01-01`;
      endDateLocal = `${yr}-12-31`;
      prevStartDateLocal = `${yr - 1}-01-01`;
      prevEndDateLocal = `${yr - 1}-12-31`;
      label = `Calendar Year ${yr}`;
      subLabel = `${formatDisplayDate(startDateLocal)} – ${formatDisplayDate(endDateLocal)}`;
      comparisonLabel = `Year ${yr - 1}`;
      bucket = 'MONTHLY';
      break;
    }

    case 'FINANCIAL_YEAR': {
      let fy = selection.financialYear;
      if (!fy) {
        fy = getFinancialYearString(nowDate);
      }
      const [startYStr] = fy.split('-');
      const startYear = parseInt(startYStr, 10);
      const endYear = startYear + 1;

      startDateLocal = `${startYear}-04-01`;
      endDateLocal = `${endYear}-03-31`;
      prevStartDateLocal = `${startYear - 1}-04-01`;
      prevEndDateLocal = `${startYear}-03-31`;

      label = `Financial Year ${fy}`;
      subLabel = `${formatDisplayDate(startDateLocal)} – ${formatDisplayDate(endDateLocal)}`;
      comparisonLabel = `FY ${startYear - 1}-${String(startYear).slice(-2)}`;
      bucket = 'MONTHLY';
      break;
    }

    case 'CUSTOM': {
      startDateLocal = selection.customStart || addDays(todayStr, -29);
      endDateLocal = selection.customEnd || todayStr;
      if (startDateLocal > endDateLocal) {
        const temp = startDateLocal;
        startDateLocal = endDateLocal;
        endDateLocal = temp;
      }
      const diffDays = getDaysDifference(startDateLocal, endDateLocal);
      label = 'Custom Range';
      subLabel = `${formatDisplayDate(startDateLocal)} – ${formatDisplayDate(endDateLocal)}`;

      if (selection.compareCustomStart && selection.compareCustomEnd) {
        prevStartDateLocal = selection.compareCustomStart;
        prevEndDateLocal = selection.compareCustomEnd;
        comparisonLabel = `${formatDisplayDate(prevStartDateLocal)} – ${formatDisplayDate(prevEndDateLocal)}`;
      } else {
        prevEndDateLocal = addDays(startDateLocal, -1);
        prevStartDateLocal = addDays(prevEndDateLocal, -(diffDays - 1));
        comparisonLabel = `Previous ${diffDays} Days (${formatDisplayDate(prevStartDateLocal)} – ${formatDisplayDate(prevEndDateLocal)})`;
      }

      if (diffDays <= 2) bucket = 'HOURLY';
      else if (diffDays <= 45) bucket = 'DAILY';
      else if (diffDays <= 180) bucket = 'WEEKLY';
      else bucket = 'MONTHLY';
      break;
    }
  }

  const subPeriodBuckets = generateSubPeriodBucketsInternal(startDateLocal, endDateLocal, bucket);

  return {
    periodType: type,
    startDate: toKolkataStartOfDayIso(startDateLocal),
    endDate: toKolkataEndOfDayIso(endDateLocal),
    startDateLocal,
    endDateLocal,
    label,
    subLabel,
    previousStartDate: comparisonMode === 'NONE' ? undefined : toKolkataStartOfDayIso(prevStartDateLocal),
    previousEndDate: comparisonMode === 'NONE' ? undefined : toKolkataEndOfDayIso(prevEndDateLocal),
    previousStartDateLocal: comparisonMode === 'NONE' ? undefined : prevStartDateLocal,
    previousEndDateLocal: comparisonMode === 'NONE' ? undefined : prevEndDateLocal,
    comparisonLabel: comparisonMode === 'NONE' ? undefined : comparisonLabel,
    bucket,
    subPeriodBuckets,
  };
}

function generateSubPeriodBucketsInternal(
  startLocal: string,
  endLocal: string,
  bucket: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
): SubPeriodBucket[] {
  const buckets: SubPeriodBucket[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (bucket === 'HOURLY') {
    for (let h = 0; h < 24; h++) {
      const hStr = String(h).padStart(2, '0');
      const startIso = new Date(`${startLocal}T${hStr}:00:00.000+05:30`).toISOString();
      const endIso = new Date(`${startLocal}T${hStr}:59:59.999+05:30`).toISOString();
      buckets.push({
        key: `${startLocal}_${hStr}`,
        label: `${hStr}:00`,
        startDate: startIso,
        endDate: endIso,
        startDateLocal: startLocal,
        endDateLocal: startLocal,
      });
    }
    return buckets;
  }

  if (bucket === 'DAILY') {
    let curr = startLocal;
    while (curr <= endLocal) {
      const [y, m, d] = curr.split('-');
      const label = `${parseInt(d, 10)} ${monthNames[parseInt(m, 10) - 1]}`;
      buckets.push({
        key: curr,
        label,
        startDate: toKolkataStartOfDayIso(curr),
        endDate: toKolkataEndOfDayIso(curr),
        startDateLocal: curr,
        endDateLocal: curr,
      });
      curr = addDays(curr, 1);
    }
    return buckets;
  }

  if (bucket === 'WEEKLY') {
    let curr = startLocal;
    let weekIndex = 1;
    while (curr <= endLocal) {
      const wEnd = addDays(curr, 6);
      const actualEnd = wEnd > endLocal ? endLocal : wEnd;
      buckets.push({
        key: `W${weekIndex}_${curr}`,
        label: `W${weekIndex} (${formatDisplayDate(curr).split(' ')[0]}–${formatDisplayDate(actualEnd).split(' ')[0]} ${monthNames[parseInt(curr.split('-')[1], 10) - 1]})`,
        startDate: toKolkataStartOfDayIso(curr),
        endDate: toKolkataEndOfDayIso(actualEnd),
        startDateLocal: curr,
        endDateLocal: actualEnd,
      });
      curr = addDays(actualEnd, 1);
      weekIndex++;
    }
    return buckets;
  }

  const [startY, startM] = startLocal.split('-').map(Number);
  const [endY, endM] = endLocal.split('-').map(Number);
  let curY = startY;
  let curM = startM;

  while (curY < endY || (curY === endY && curM <= endM)) {
    const sMonth = String(curM).padStart(2, '0');
    const mStart = `${curY}-${sMonth}-01`;
    const lastDay = new Date(Date.UTC(curY, curM, 0)).getUTCDate();
    const mEnd = `${curY}-${sMonth}-${String(lastDay).padStart(2, '0')}`;

    const effectiveStart = mStart < startLocal ? startLocal : mStart;
    const effectiveEnd = mEnd > endLocal ? endLocal : mEnd;

    buckets.push({
      key: `${curY}-${sMonth}`,
      label: `${monthNames[curM - 1]} '${String(curY).slice(-2)}`,
      startDate: toKolkataStartOfDayIso(effectiveStart),
      endDate: toKolkataEndOfDayIso(effectiveEnd),
      startDateLocal: effectiveStart,
      endDateLocal: effectiveEnd,
    });

    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  return buckets;
}

export function calculateComparison(current: number, previous: number = 0): ComparisonResult {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;
  const absoluteDiff = Math.round((cur - prev) * 100) / 100;

  let percentageChange = 0;
  if (prev === 0) {
    percentageChange = cur > 0 ? 100 : cur < 0 ? -100 : 0;
  } else {
    percentageChange = Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
  }

  const isPositive = absoluteDiff > 0;
  const isNeutral = absoluteDiff === 0;
  const sign = isPositive ? '+' : '';
  const formattedChange = isNeutral ? '0.0%' : `${sign}${percentageChange.toFixed(1)}%`;

  return {
    current: cur,
    previous: prev,
    absoluteDiff,
    percentageChange,
    isPositive,
    isNeutral,
    formattedChange,
  };
}
