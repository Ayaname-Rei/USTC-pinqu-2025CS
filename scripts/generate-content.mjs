import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JOURNAL_DIR = "期刊";
const GALLERY_DIR = "班级风采";
const OUTPUT_FILE = path.join(ROOT, "data", "content.json");
const CLASS_START_YEAR = 2025;
const CLASS_START_MONTH = 9;
const FEATURED_PER_MONTH = 1;

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function stripExtension(filename) {
  return filename.slice(0, filename.length - path.extname(filename).length);
}

function parseTitleAuthor(sourceName) {
  const base = stripExtension(path.basename(sourceName)).trim();
  const match = base.match(/^(.*?)\s*[（(]([^()（）]+)[）)]\s*$/u);

  if (!match) {
    return {
      title: base,
      author: "未标注作者",
    };
  }

  return {
    title: match[1].trim(),
    author: match[2].trim(),
  };
}

function inferYearFromMonth(month) {
  return month >= 9 ? CLASS_START_YEAR : CLASS_START_YEAR + 1;
}

function countCompanionMonths(date = new Date()) {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth() + 1;
  const months = (currentYear - CLASS_START_YEAR) * 12 + currentMonth - CLASS_START_MONTH + 1;
  return Math.max(1, months);
}

function parseIssue(folderParts) {
  const issuePart = folderParts.find((part) => /(?:\d{4}\s*年\s*)?\d{1,2}\s*月/u.test(part));
  if (!issuePart) {
    return {
      year: null,
      month: null,
      label: "未归档",
      sortValue: 0,
    };
  }

  const match = issuePart.match(/(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月/u);
  const month = Number(match?.[2]);
  const year = match?.[1] ? Number(match[1]) : inferYearFromMonth(month);

  return {
    year,
    month,
    label: `${year}年${String(month).padStart(2, "0")}月`,
    sortValue: year * 100 + month,
  };
}

function parsePhotoName(filename) {
  const base = stripExtension(filename);
  const match = base.match(/^(.*?)_(\d{4})[-.]?(\d{2})[-.]?(\d{2})$/u);

  if (!match) {
    return {
      name: base,
      date: null,
      year: null,
      month: null,
      day: null,
      monthKey: "undated",
      monthLabel: "未标注时间",
      displayDate: "未标注时间",
      sortValue: 0,
    };
  }

  const [, rawName, year, month, day] = match;
  return {
    name: rawName.trim(),
    date: `${year}-${month}-${day}`,
    year: Number(year),
    month: Number(month),
    day: Number(day),
    monthKey: `${year}-${month}`,
    monthLabel: `${year}年${month}月`,
    displayDate: `${year}.${month}.${day}`,
    sortValue: Number(`${year}${month}${day}`),
  };
}

async function walk(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function readJournals() {
  const files = await walk(JOURNAL_DIR);
  return files
    .filter((file) => path.extname(file).toLowerCase() === ".pdf")
    .filter((file) => !file.includes("期刊样例"))
    .map((file) => {
      const relativeParts = toPosix(file).split("/");
      const folderParts = relativeParts.slice(1, -1);
      const parentName = folderParts.at(-1) ?? "";
      const metadataSource = /[（(][^()（）]+[）)]\s*$/u.test(stripExtension(path.basename(file)))
        ? path.basename(file)
        : parentName || path.basename(file);
      const issue = parseIssue(folderParts);
      const parsed = parseTitleAuthor(metadataSource);

      return {
        title: parsed.title,
        author: parsed.author,
        issue: issue.label,
        year: issue.year,
        month: issue.month,
        sortValue: issue.sortValue,
        href: toPosix(file),
      };
    })
    .sort((a, b) => b.sortValue - a.sortValue || a.title.localeCompare(b.title, "zh-Hans-CN"));
}

async function readPhotos() {
  const files = await walk(GALLERY_DIR);
  return files
    .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()))
    .map((file) => {
      const parsed = parsePhotoName(path.basename(file));
      return {
        name: parsed.name,
        date: parsed.date,
        displayDate: parsed.displayDate,
        monthKey: parsed.monthKey,
        monthLabel: parsed.monthLabel,
        sortValue: parsed.sortValue,
        src: toPosix(file),
      };
    })
    .sort((a, b) => b.sortValue - a.sortValue || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function groupTimeline(photos) {
  const groups = new Map();

  for (const photo of photos) {
    if (!groups.has(photo.monthKey)) {
      groups.set(photo.monthKey, {
        key: photo.monthKey,
        label: photo.monthLabel,
        sortValue: photo.sortValue,
        count: 0,
        photos: [],
      });
    }

    const group = groups.get(photo.monthKey);
    group.count += 1;
    group.sortValue = Math.max(group.sortValue, photo.sortValue);
    if (group.photos.length < FEATURED_PER_MONTH) {
      group.photos.push(photo);
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.sortValue - a.sortValue);
}

async function main() {
  const [journals, photos] = await Promise.all([readJournals(), readPhotos()]);
  const generatedAt = new Date().toISOString();
  const payload = {
    generatedAt,
    settings: {
      featuredPerMonth: FEATURED_PER_MONTH,
      journalRule: "期刊目录建议为：期刊/YYYY年M月/标题 (作者).pdf；若 PDF 在子文件夹中，子文件夹名需为：标题 (作者)。期刊样例会被忽略。",
      photoRule: "班级风采图片需为：名称_YYYYMMDD.jpg。",
    },
    stats: {
      journals: journals.length,
      photos: photos.length,
      timelineMonths: groupTimeline(photos).length,
      companionMonths: countCompanionMonths(),
    },
    journals,
    photos,
    timeline: groupTimeline(photos),
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Generated ${toPosix(path.relative(ROOT, OUTPUT_FILE))}`);
  console.log(`${journals.length} journals, ${photos.length} photos`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
