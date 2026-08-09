import PDFDocument from 'pdfkit';

export class PdfService {
  /**
   * Generate PDF Invoice stream for Order
   */
  static generateInvoicePdf(order: any): any {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Header
    doc
      .fillColor('#E2131F')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ALPHAATECH PERFORMANCE COMPUTING', { align: 'left' });

    doc
      .fillColor('#666666')
      .fontSize(10)
      .font('Helvetica')
      .text('Precision Engineering & Workstation Solutions', { align: 'left' });

    doc.moveDown(1.5);

    // Order Meta Box
    doc
      .fillColor('#000000')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`TAX INVOICE — ORDER #${order.orderNumber}`);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#444444')
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`)
      .text(`Payment Status: ${order.paymentStatus}`)
      .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`);

    doc.moveDown(1);

    // Customer / Shipping Details
    const addr = order.shippingAddress || {};
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Billed & Shipped To:');

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#333333')
      .text(order.customerName)
      .text(`${addr.line1 || ''} ${addr.line2 || ''}`)
      .text(`${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || ''}`)
      .text(`Phone: ${order.customerPhone}`)
      .text(`Email: ${order.customerEmail}`);

    doc.moveDown(1.5);

    // Table Headers
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#E2131F')
      .text('ITEM DESCRIPTION', 40, doc.y, { width: 300 })
      .text('QTY', 350, doc.y, { width: 50, align: 'center' })
      .text('PRICE', 420, doc.y, { width: 100, align: 'right' });

    doc
      .strokeColor('#CCCCCC')
      .lineWidth(1)
      .moveTo(40, doc.y + 5)
      .lineTo(540, doc.y + 5)
      .stroke();

    doc.moveDown(0.8);

    // Items List
    (order.items || []).forEach((item: any) => {
      const p = item.product || {};
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#000000')
        .text(p.name || 'Hardware Product', 40, doc.y, { width: 300 })
        .text(String(item.quantity || 1), 350, doc.y, { width: 50, align: 'center' })
        .text(`₹${Number(item.price || 0).toLocaleString('en-IN')}`, 420, doc.y, { width: 100, align: 'right' });

      doc.moveDown(0.5);
    });

    doc.moveDown(1);

    // Totals Box
    doc
      .strokeColor('#E2131F')
      .lineWidth(1)
      .moveTo(350, doc.y)
      .lineTo(540, doc.y)
      .stroke();

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text('GRAND TOTAL:', 350, doc.y, { width: 90 })
      .fillColor('#E2131F')
      .text(`₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}`, 440, doc.y, { width: 100, align: 'right' });

    doc.moveDown(3);
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#888888')
      .text('Thank you for choosing AlphaaTechh. All custom builds include a 3-Year On-Site Warranty.', { align: 'center' });

    return doc;
  }
}
