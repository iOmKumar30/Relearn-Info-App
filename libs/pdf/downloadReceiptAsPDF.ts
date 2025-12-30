import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

export async function downloadReceiptAsPDF(opts: {
  element: HTMLElement;
  filename: string;
  scale?: number;
}) {
  const { element, filename, scale = 2 } = opts;

  // 1. Capture the element
  // ensuring the capture area matches the receipt's explicit A4 styling
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale,
    useCORS: true,
    logging: false,
    allowTaint: true,
    // Force canvas to match the scroll dimensions of the card
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");

  // 2. Create PDF in PORTRAIT (p) mode, A4, mm units
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = 210;
  // Calculate height maintaining aspect ratio
  const imgProps = pdf.getImageProperties(imgData);
  const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

  // 3. Add image at 0,0 (component padding acts as margin)
  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight, undefined, "FAST");

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
