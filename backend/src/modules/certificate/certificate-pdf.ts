type CertificatePdfData = {
  verificationCode: string;
  issuedAt: Date;
  user: {
    email: string;
    name?: string | null;
  };
  course: {
    title: string;
    instructor: {
      email: string;
      name?: string | null;
    };
  };
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_CENTER_X = PAGE_WIDTH / 2;
const CONTENT_LEFT = 52;
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_LEFT * 2;

function toAscii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function escapePdfText(value: string) {
  return toAscii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function line(text: string, x: number, y: number, size = 14, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`;
}

function estimateTextWidth(text: string, size: number) {
  return toAscii(text).length * size * 0.56;
}

function fitText(rawText: string, preferredSize: number, maxWidth: number, minSize = 12) {
  const text = rawText.trim();
  if (!text) {
    return { text: "-", size: minSize };
  }

  let size = preferredSize;
  while (size > minSize && estimateTextWidth(text, size) > maxWidth) {
    size -= 1;
  }
  return { text, size };
}

function centeredLine(text: string, centerX: number, y: number, size = 14, font = "F1") {
  const width = estimateTextWidth(text, size);
  const x = Math.max(48, centerX - width / 2);
  return line(text, x, y, size, font);
}

function toDisplayName(name: string | null | undefined, email: string) {
  const cleanName = (name ?? "").trim();
  if (cleanName.length > 0) {
    return cleanName;
  }

  const localPart = email.split("@")[0] ?? email;
  const spaced = localPart.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!spaced) {
    return "Learner";
  }

  return spaced
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createContent(data: CertificatePdfData) {
  const issuedAt = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(data.issuedAt);
  const learnerName = toDisplayName(data.user.name, data.user.email);
  const instructorName = toDisplayName(data.course.instructor.name, data.course.instructor.email);
  const learnerLine = fitText(learnerName, 42, CONTENT_WIDTH - 36, 24);
  const courseLine = fitText(data.course.title, 30, CONTENT_WIDTH - 28, 18);

  return [
    "0.965 0.973 0.99 rg 0 0 595 842 re f",
    "0.102 0.196 0.384 RG 24 24 547 794 re S",
    "0.78 0.846 0.96 RG 36 36 523 770 re S",
    "0.102 0.196 0.384 rg 52 742 491 56 re f",
    centeredLine("EDTECH PLATFORM", PAGE_CENTER_X, 763, 17, "F2"),
    centeredLine("CERTIFICATE OF COMPLETION", PAGE_CENTER_X, 668, 36, "F2"),
    centeredLine("This certifies that", PAGE_CENTER_X, 620, 15),
    centeredLine(learnerLine.text, PAGE_CENTER_X, 558, learnerLine.size, "F2"),
    "0.73 0.81 0.95 rg 88 544 419 1.4 re f",
    centeredLine("has successfully completed", PAGE_CENTER_X, 514, 15),
    centeredLine(courseLine.text, PAGE_CENTER_X, 460, courseLine.size, "F2"),
    "0.73 0.81 0.95 rg 76 446 443 1.4 re f",
    "0.90 0.934 0.985 rg 64 236 467 146 re f",
    "0.69 0.79 0.93 RG 64 236 467 146 re S",
    line(`Instructor: ${instructorName}`, 88, 340, 12),
    line(`Issue date: ${issuedAt}`, 88, 314, 12),
    line(`Verification code: ${data.verificationCode}`, 88, 288, 12),
    line("Certificate ID for platform records.", 88, 262, 10),
    "0.102 0.196 0.384 rg 430 176 92 92 re f",
    centeredLine("APPROVED", 476, 224, 11, "F2"),
    centeredLine("DIGITAL SEAL", 476, 207, 10, "F2"),
    centeredLine("www.edtech-platform.local", PAGE_CENTER_X, 96, 11)
  ].join("\n");
}

export function createCertificatePdf(data: CertificatePdfData) {
  const content = createContent(data);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "ascii");
}
