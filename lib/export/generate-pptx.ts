import PptxGenJS from 'pptxgenjs';

export async function generatePptxBuffer(params: {
  title: string;
  companyName?: string;
  slides: Array<{ title: string; bullets: string[]; speakerNotes?: string }>;
}): Promise<Buffer> {
  const { title, companyName, slides } = params;

  const pres = new PptxGenJS();
  pres.title = title;
  if (companyName) pres.subject = `Presentation for ${companyName}`;
  pres.layout = 'LAYOUT_WIDE';

  for (const slideData of slides) {
    const slide = pres.addSlide();

    slide.addText(slideData.title, {
      x: 0.6,
      y: 0.4,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '1a1a2e',
      fontFace: 'Arial',
      valign: 'top',
    });

    const bulletRows = slideData.bullets.map((text) => ({
      text,
      options: {
        fontSize: 14,
        color: '333333' as const,
        fontFace: 'Arial',
        bullet: { code: '2022' } as const,
        paraSpaceAfter: 8,
      },
    }));

    slide.addText(bulletRows, {
      x: 0.6,
      y: 1.4,
      w: '85%',
      h: 4.6,
      valign: 'top',
      lineSpacingMultiple: 1.2,
    });

    if (slideData.speakerNotes) {
      slide.addNotes(slideData.speakerNotes);
    }
  }

  const output = await pres.write({ outputType: 'nodebuffer' });
  return output as Buffer;
}
