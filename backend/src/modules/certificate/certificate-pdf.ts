type CertificatePdfData = {
  verificationCode: string;
  issuedAt: Date;
  user: {
    email: string;
  };
  course: {
    title: string;
    instructor: {
      email: string;
    };
  };
};

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

function createContent(data: CertificatePdfData) {
  const issuedAt = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(data.issuedAt);
  return [
    "0.98 0.98 0.96 rg 0 0 842 595 re f",
    "0.12 0.12 0.12 RG 36 36 770 523 re S",
    "0.68 0.53 0.24 RG 50 50 742 495 re S",
    line("CERTIFICATE OF COMPLETION", 206, 486, 30, "F2"),
    line("This certifies that", 352, 420, 15),
    line(data.user.email, 230, 382, 24, "F2"),
    line("has successfully completed", 314, 335, 15),
    line(data.course.title, 170, 298, 22, "F2"),
    line(`Instructor: ${data.course.instructor.email}`, 88, 228, 13),
    line(`Issued: ${issuedAt}`, 88, 202, 13),
    line(`Verification code: ${data.verificationCode}`, 88, 176, 11),
    line("Verify this certificate on the platform verification page.", 88, 126, 11),
    line("EdTech Platform", 595, 126, 18, "F2")
  ].join("\n");
}

export function createCertificatePdf(data: CertificatePdfData) {
  const content = createContent(data);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
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
