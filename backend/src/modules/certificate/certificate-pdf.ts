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
    "0.96 0.97 0.99 rg 0 0 842 595 re f",
    "0.09 0.20 0.42 RG 30 30 782 535 re S",
    "0.20 0.47 0.84 RG 46 46 750 503 re S",
    "0.09 0.20 0.42 rg 312 510 218 34 re f",
    line("CERTIFICATE OF COMPLETION", 214, 490, 34, "F2"),
    line("Presented to", 374, 438, 14),
    line(data.user.email, 174, 402, 26, "F2"),
    line("for successfully completing", 317, 356, 14),
    line(data.course.title, 132, 320, 25, "F2"),
    "0.85 0.90 0.98 rg 88 146 668 106 re f",
    "0.09 0.20 0.42 RG 88 146 668 106 re S",
    line(`Instructor: ${data.course.instructor.email}`, 112, 220, 13),
    line(`Issued on ${issuedAt}`, 112, 196, 13),
    line(`Verification code: ${data.verificationCode}`, 112, 172, 12),
    line("Verify this certificate in EdTech Platform certificate verifier.", 112, 152, 10),
    line("EDTECH PLATFORM", 580, 96, 18, "F2")
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
