import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, FileText, FileDown, MessageCircle, Image } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

type SectionActionButtonsProps = {
  /** Returns the plain-text content used for copy/export/share */
  getText: () => string;
  /** Used for exported file names (without extension) */
  filenameBase: string;
  /** Optional PDF layout settings */
  pdf?: {
    headerTitle?: string;
    headerSubtitle?: string;
    footerLines?: string[];
  };
  /** Optional: override default toast messages */
  labels?: {
    copied?: string;
    exportedTxt?: string;
    exportedPdf?: string;
  };
  /** When provided, the PDF button captures this DOM element visually */
  visualContainerRef?: React.RefObject<HTMLDivElement>;
};

const openExternalShare = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const downloadTxt = (text: string, filename: string) => {
  const element = document.createElement("a");
  const file = new Blob([text], { type: "text/plain; charset=utf-8" });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

// Helper: fetch an image URL and return a base64 data URI
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    // Try via proxy to avoid CORS
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url)}&n=-1&output=jpg&q=80`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// --- Visual PDF export using html2canvas ---
const exportVisualPdf = async (
  container: HTMLDivElement,
  filename: string,
  options?: SectionActionButtonsProps["pdf"]
) => {
  toast.info("Gerando PDF visual, aguarde...");

  try {
    // Pre-fetch all photos from fotos-section as base64 before html2canvas
    const fotosSection = container.querySelector('#fotos-section');
    const photoBase64Map = new Map<string, string>();
    
    if (fotosSection) {
      const imgs = fotosSection.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
      const photoUrls: string[] = [];
      imgs.forEach(img => {
        const src = img.getAttribute('src') || '';
        if (src && (src.startsWith('http') || src.startsWith('data:'))) {
          photoUrls.push(src);
        }
      });

      // Fetch all photos in parallel
      const results = await Promise.all(
        photoUrls.map(async (url) => {
          if (url.startsWith('data:')) return { url, base64: url };
          const base64 = await fetchImageAsBase64(url);
          return { url, base64 };
        })
      );
      results.forEach(r => {
        if (r.base64) photoBase64Map.set(r.url, r.base64);
      });
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 900,
      scrollY: -window.scrollY,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.body.querySelector('[data-pdf-container]') as HTMLElement;
        if (clonedEl) {
          clonedEl.style.overflow = 'visible';
          clonedEl.style.maxHeight = 'none';
          clonedEl.style.width = '860px';
          clonedEl.style.padding = '16px';
          clonedEl.style.fontSize = '14px';
          clonedEl.style.backgroundColor = '#ffffff';
          clonedEl.style.color = '#111827';

          // Force all cards/content to be full width and visible
          clonedEl.querySelectorAll<HTMLElement>('.overflow-hidden, .overflow-x-auto, .overflow-x-hidden').forEach(el => {
            el.style.overflow = 'visible';
          });

          // Ensure grid columns render properly for PDF
          clonedEl.querySelectorAll<HTMLElement>('[class*="grid"]').forEach(el => {
            el.style.display = 'grid';
            el.style.width = '100%';
          });

          // ===== FIX: Input fields - replace with div showing value =====
          clonedEl.querySelectorAll<HTMLElement>('input').forEach(el => {
            const value = (el as HTMLInputElement).value || '';
            const div = clonedDoc.createElement('div');
            div.textContent = value || '—';
            div.style.textAlign = 'left';
            div.style.paddingLeft = '12px';
            div.style.paddingRight = '12px';
            div.style.height = '36px';
            div.style.lineHeight = '36px';
            div.style.color = '#111827';
            div.style.border = '1px solid #d1d5db';
            div.style.borderRadius = '6px';
            div.style.backgroundColor = '#f9fafb';
            div.style.fontSize = '13px';
            div.style.overflow = 'hidden';
            div.style.textOverflow = 'ellipsis';
            div.style.whiteSpace = 'nowrap';
            el.parentNode?.replaceChild(div, el);
          });

          // ===== FIX: Badge counts - convert absolute positioned numbers to inline =====
          clonedEl.querySelectorAll<HTMLElement>('.relative.inline-flex').forEach(wrapper => {
            const countEl = wrapper.querySelector('.absolute.-top-2, [class*="absolute"][class*="-top-2"]') as HTMLElement;
            if (countEl) {
              const count = countEl.textContent?.trim() || '';
              // Remove the absolute positioned element
              countEl.remove();
              // Find the badge and append count inline
              const badge = wrapper.querySelector('[class*="badge"], [class*="Badge"]') as HTMLElement;
              if (badge && count) {
                badge.style.display = 'inline-flex';
                badge.style.alignItems = 'center';
                badge.style.gap = '4px';
                // Create inline count span
                const inlineCount = clonedDoc.createElement('span');
                inlineCount.textContent = `(${count})`;
                inlineCount.style.backgroundColor = '#dc2626';
                inlineCount.style.color = '#ffffff';
                inlineCount.style.borderRadius = '9999px';
                inlineCount.style.padding = '1px 6px';
                inlineCount.style.fontSize = '10px';
                inlineCount.style.fontWeight = '700';
                inlineCount.style.marginLeft = '4px';
                badge.appendChild(inlineCount);
              }
            }
          });

          // ===== FIX: Shortcut badges at top - ensure proper wrapping =====
          clonedEl.querySelectorAll<HTMLElement>('.flex.flex-wrap').forEach(el => {
            el.style.display = 'flex';
            el.style.flexWrap = 'wrap';
            el.style.gap = '8px';
            el.style.overflow = 'visible';
          });

          // ===== FIX: Score gauge cards - fix SVG rendering =====
          clonedEl.querySelectorAll<HTMLElement>('svg').forEach(svg => {
            svg.style.overflow = 'visible';
          });

          // Fix aspect-ratio (html2canvas doesn't support it well)
          clonedEl.querySelectorAll<HTMLElement>('[class*="aspect-"]').forEach(el => {
            const computed = window.getComputedStyle(el);
            const ratio = computed.aspectRatio;
            if (ratio && ratio !== 'auto') {
              const parts = ratio.split('/').map(s => parseFloat(s.trim()));
              if (parts.length === 2 && parts[0] && parts[1]) {
                const width = el.offsetWidth || 200;
                el.style.height = `${(width * parts[1]) / parts[0]}px`;
                el.style.aspectRatio = 'auto';
              }
            }
          });

          // ===== FIX: Fotos section - render actual photos in 2-column grid =====
          const clonedFotosSection = clonedEl.querySelector('#fotos-section') as HTMLElement;
          if (clonedFotosSection) {
            const imgs = clonedFotosSection.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
            // Collect real photo sources (not placeholder)
            const realPhotos: { src: string; base64: string }[] = [];
            imgs.forEach(img => {
              const src = img.getAttribute('src') || '';
              if (src) {
                // Check if we have a base64 version
                const base64 = photoBase64Map.get(src);
                if (base64) {
                  realPhotos.push({ src, base64 });
                }
              }
            });

            if (realPhotos.length > 0) {
              // Determine layout: 1 photo → show 1, 2 photos → 2 per line, 3+ → up to 4 (2x2)
              const photosToShow = realPhotos.slice(0, 4);
              
              // Build the photo grid HTML
              let gridHtml = `
                <div style="border:1px solid #bbf7d0; border-radius:12px; padding:16px; background:#f0fdf4;">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <span style="font-size:18px;">📷</span>
                    <strong style="font-size:15px; color:#111827;">Fotos</strong>
                    <span style="background:#16a34a; color:white; font-size:11px; padding:2px 8px; border-radius:10px;">ONLINE</span>
                    <span style="background:#dc2626; color:white; font-size:10px; padding:1px 6px; border-radius:10px; font-weight:700;">${realPhotos.length}</span>
                  </div>
                  <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              `;
              
              photosToShow.forEach((photo, idx) => {
                gridHtml += `
                  <div style="border:1px solid #d1d5db; border-radius:8px; overflow:hidden; background:#fff;">
                    <img src="${photo.base64}" alt="Foto ${idx + 1}" style="width:100%; height:200px; object-fit:cover; display:block;" crossorigin="anonymous" />
                    <div style="padding:6px; text-align:center; background:#2563eb; color:white; font-size:13px; font-weight:500;">Foto ${idx + 1}</div>
                  </div>
                `;
              });
              
              gridHtml += `</div></div>`;
              clonedFotosSection.innerHTML = gridHtml;
            } else {
              // No photos could be loaded - hide the section
              clonedFotosSection.style.display = 'none';
            }
          }

          // ===== FIX: Remove any remaining cross-origin images to prevent taint =====
          clonedEl.querySelectorAll<HTMLImageElement>('img').forEach(img => {
            const src = img.getAttribute('src') || '';
            if (src.startsWith('http') && !src.includes(window.location.hostname)) {
              img.style.display = 'none';
            }
          });

          // ===== FIX: Hide interactive-only elements =====
          clonedEl.querySelectorAll<HTMLElement>('.opacity-0').forEach(el => {
            el.style.display = 'none';
          });

          // ===== FIX: Labels should be visible =====
          clonedEl.querySelectorAll<HTMLElement>('label').forEach(el => {
            el.style.display = 'block';
            el.style.marginBottom = '4px';
            el.style.fontSize = '12px';
            el.style.color = '#6b7280';
          });

          // ===== FIX: Ensure all text is dark =====
          clonedEl.querySelectorAll<HTMLElement>('*').forEach(el => {
            const computed = window.getComputedStyle(el);
            if (computed.color === 'rgba(0, 0, 0, 0)' || computed.opacity === '0') {
              el.style.color = '#111827';
              el.style.opacity = '1';
            }
          });

          // ===== FIX: Card backgrounds to white =====
          clonedEl.querySelectorAll<HTMLElement>('[class*="bg-card"], [class*="bg-background"]').forEach(el => {
            el.style.backgroundColor = '#ffffff';
          });
          clonedEl.querySelectorAll<HTMLElement>('[class*="bg-success-subtle"]').forEach(el => {
            el.style.backgroundColor = '#f0fdf4';
          });
          clonedEl.querySelectorAll<HTMLElement>('[class*="bg-muted"]').forEach(el => {
            el.style.backgroundColor = '#f3f4f6';
          });

          // ===== FIX: Score section - hide if no data =====
          const scoreSection = clonedEl.querySelector('#score-section') as HTMLElement;
          if (scoreSection) {
            const scoreText = scoreSection.textContent || '';
            const scoreMatch = scoreText.match(/(\d+)/);
            const scoreVal = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
            if (scoreVal <= 0) {
              scoreSection.style.display = 'none';
            }
          }
        }
      }
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // A4 dimensions in pt
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 36;
    const headerH = 56;
    const footerH = 48;
    const contentWidth = pageWidth - margin * 2;
    const contentTop = margin + headerH;
    const contentMaxH = pageHeight - contentTop - footerH - margin;

    // Scale image to fit page width
    const scale = contentWidth / imgWidth;
    const scaledHeight = imgHeight * scale;
    const totalPages = Math.ceil(scaledHeight / contentMaxH);

    const headerTitle = options?.headerTitle ?? "APIPAINEL.COM.BR";
    const headerSubtitle =
      options?.headerSubtitle ?? "Relatório Completo de Consulta CPF";
    const nowStr = new Date().toLocaleString("pt-BR");

    const addHeaderFooter = (pageNum: number) => {
      // Header
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, margin + 44, pageWidth - margin, margin + 44);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(headerTitle, margin, margin + 18);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(headerSubtitle, margin, margin + 34);

      pdf.setFontSize(8);
      pdf.text(nowStr, pageWidth - margin, margin + 18, { align: "right" });

      // Footer
      pdf.setDrawColor(200);
      pdf.line(margin, pageHeight - margin - 36, pageWidth - margin, pageHeight - margin - 36);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(
        `© ${new Date().getFullYear()} APIPAINEL.COM.BR — Todos os direitos reservados.`,
        margin,
        pageHeight - margin - 20
      );
      pdf.text(
        `Página ${pageNum} de ${totalPages}`,
        pageWidth - margin,
        pageHeight - margin - 20,
        { align: "right" }
      );
    };

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage();
      addHeaderFooter(i + 1);

      // Clip the portion of the image for this page
      const sourceY = (i * contentMaxH) / scale;
      const sourceH = Math.min(contentMaxH / scale, imgHeight - sourceY);
      const destH = sourceH * scale;

      // Create a temporary canvas for this page slice
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = imgWidth;
      sliceCanvas.height = Math.ceil(sourceH);
      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, Math.floor(sourceY), imgWidth, Math.ceil(sourceH),
          0, 0, imgWidth, Math.ceil(sourceH)
        );
        const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(sliceData, "JPEG", margin, contentTop, contentWidth, destH);
      }
    }

    pdf.save(filename);
    toast.success("PDF visual exportado com sucesso!");
  } catch (error) {
    console.error("Erro ao gerar PDF visual:", error);
    toast.error("Erro ao gerar PDF. Tente novamente.");
  }
};

// --- Text-based PDF export (fallback) ---
const exportTextPdf = (
  text: string,
  filename: string,
  options?: SectionActionButtonsProps["pdf"]
) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFont("helvetica", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const headerH = 72;
  const footerH = 70;
  const contentTop = marginX + headerH;
  const contentBottom = pageHeight - marginX - footerH;
  const maxWidth = pageWidth - marginX * 2;

  const headerTitle = options?.headerTitle ?? "APIPAINEL.COM.BR";
  const headerSubtitle = options?.headerSubtitle ?? "Relatório Completo de Consulta CPF";
  const footerLines = options?.footerLines ?? [
    "Este relatório contém informações confidenciais e deve ser tratado com segurança e de acordo com a LGPD.",
    `© ${new Date().getFullYear()} APIPAINEL.COM.BR — Todos os direitos reservados.`,
  ];
  const nowStr = new Date().toLocaleString("pt-BR");

  const addHeaderFooter = (pageNumber: number) => {
    doc.setDrawColor(220);
    doc.setLineWidth(1);
    doc.line(marginX, marginX + 54, pageWidth - marginX, marginX + 54);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(headerTitle, marginX, marginX + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(headerSubtitle, marginX, marginX + 40);
    doc.setFontSize(9);
    doc.text(nowStr, pageWidth - marginX, marginX + 22, { align: "right" });
    doc.setDrawColor(220);
    doc.line(marginX, pageHeight - marginX - 44, pageWidth - marginX, pageHeight - marginX - 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const footerText = footerLines.join("\n");
    const footerWrapped = doc.splitTextToSize(footerText, maxWidth);
    doc.text(footerWrapped, marginX, pageHeight - marginX - 30);
    doc.setFontSize(9);
    doc.text(`Página ${pageNumber}`, pageWidth - marginX, pageHeight - marginX, { align: "right" });
  };

  const rawLines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  const isSeparator = (line: string) => /^-+$/.test(line.trim());
  const isSectionTitle = (line: string) => {
    const t = line.trim();
    if (!t || isSeparator(t)) return false;
    const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
    if (letters.length < 6) return false;
    const upperRatio = letters.split("").filter((c) => c === c.toUpperCase()).length / letters.length;
    return upperRatio > 0.9 && t.length <= 44;
  };

  let page = 1;
  addHeaderFooter(page);
  let cursorY = contentTop;

  const ensureSpace = (needed: number) => {
    if (cursorY + needed <= contentBottom) return;
    doc.addPage();
    page += 1;
    addHeaderFooter(page);
    cursorY = contentTop;
  };

  rawLines.forEach((line) => {
    if (isSeparator(line)) return;
    if (isSectionTitle(line)) {
      ensureSpace(28);
      cursorY += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(line.trim(), marginX, cursorY);
      cursorY += 14;
      doc.setDrawColor(230);
      doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
      cursorY += 10;
      return;
    }
    const idx = line.indexOf(":");
    if (idx > 0 && idx < 28) {
      const label = line.slice(0, idx + 1).trim();
      const value = line.slice(idx + 1).trim();
      ensureSpace(22);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      const labelW = doc.getTextWidth(label) + 6;
      doc.text(label, marginX, cursorY);
      doc.setFont("helvetica", "normal");
      const valueMaxW = Math.max(40, maxWidth - labelW);
      const wrappedVal = doc.splitTextToSize(value || "—", valueMaxW);
      doc.text(wrappedVal, marginX + labelW, cursorY);
      cursorY += wrappedVal.length * 14;
      return;
    }
    ensureSpace(22);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(line, maxWidth);
    doc.text(wrapped, marginX, cursorY);
    cursorY += wrapped.length * 14;
  });

  doc.save(filename);
};

const SectionActionButtons: React.FC<SectionActionButtonsProps> = ({
  getText,
  filenameBase,
  pdf,
  labels,
  visualContainerRef,
}) => {
  const onCopy = async () => {
    const text = getText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success(labels?.copied ?? "Dados copiados!");
  };

  const onExportTxt = () => {
    const text = getText();
    if (!text) return;
    downloadTxt(text, `${filenameBase}.txt`);
    toast.success(labels?.exportedTxt ?? "TXT exportado com sucesso!");
  };

  const onExportPdf = async () => {
    // If a visual container ref is provided, use html2canvas capture
    if (visualContainerRef?.current) {
      await exportVisualPdf(visualContainerRef.current, `${filenameBase}.pdf`, pdf);
      return;
    }
    // Fallback to text-based PDF
    const text = getText();
    if (!text) return;
    exportTextPdf(text, `${filenameBase}.pdf`, pdf);
    toast.success(labels?.exportedPdf ?? "PDF exportado com sucesso!");
  };

  const onShareWhatsApp = () => {
    const text = getText();
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    openExternalShare(url);
  };

  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-md border bg-background shadow-sm"
      aria-label="Ações do relatório"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onCopy}
        className="h-8 w-8 rounded-none"
        title="Copiar"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onExportTxt}
        className="h-8 w-8 rounded-none border-l"
        title="Exportar TXT"
      >
        <FileText className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onExportPdf}
        className="h-8 w-8 rounded-none border-l"
        title="Exportar PDF Visual"
      >
        <FileDown className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onShareWhatsApp}
        className="h-8 w-8 rounded-none border-l"
        title="Enviar no WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SectionActionButtons;
