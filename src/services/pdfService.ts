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
      .text(`TAX INVOICE — ORDER #${order.orderNumber || order.id}`);

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#444444')
      .text(`Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString()}`)
      .text(`Payment Status: ${order.paymentStatus || 'PAID'}`)
      .text(`Payment Method: ${(order.paymentMethod || 'ONLINE').toUpperCase()}`);

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
      .text(order.customerName || 'Customer')
      .text(`${addr.line1 || addr.address || ''} ${addr.line2 || ''}`)
      .text(`${addr.city || ''}, ${addr.state || ''} ${addr.postalCode || addr.pin || ''}`)
      .text(`Phone: ${order.customerPhone || ''}`)
      .text(`Email: ${order.customerEmail || ''}`);

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
        .text(p.name || item.productName || item.name || 'Hardware Component', 40, doc.y, { width: 300 })
        .text(String(item.quantity || item.qty || 1), 350, doc.y, { width: 50, align: 'center' })
        .text(`Rs. ${Number(item.price || 0).toLocaleString('en-IN')}`, 420, doc.y, { width: 100, align: 'right' });

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
      .text(`Rs. ${Number(order.totalAmount || 0).toLocaleString('en-IN')}`, 440, doc.y, { width: 100, align: 'right' });

    doc.moveDown(3);
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#888888')
      .text('Thank you for choosing AlphaaTechh. All custom builds include a 3-Year On-Site Warranty.', { align: 'center' });

    return doc;
  }

  /**
   * Generate PDF Invoice Buffer for Email Attachments
   */
  static generateInvoicePdfBuffer(order: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = this.generateInvoicePdf(order);
        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err: any) => reject(err));
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
