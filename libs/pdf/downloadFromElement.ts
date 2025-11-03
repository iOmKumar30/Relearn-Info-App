import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export async function downloadElementAsPDF(opts: {
  element: HTMLElement;
  filename: string;
  // A4: 210 x 297 mm, we’ll render landscape=false and fit width
  // scale improves sharpness; 2 or 3 recommended
  scale?: number;
}) {
  const { element, filename, scale = 2 } = opts;

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    logging: false,
    // Ensure fonts and images render crisply
    allowTaint: true,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "landscape", // certificate is wider; change to "portrait" if you prefer
    unit: "pt",
    format: "a4",
  });

  // Calculate image dimensions to fit the PDF page
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 60; // small margin
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const x = 30;
  const y = (pageHeight - imgHeight) / 2; // vertically centre

  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight, undefined, "FAST");
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
