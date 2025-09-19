// Diagnostic code to test data structure
// This can be temporarily added to CompareView.jsx for debugging

console.log('=== COMPARE VIEW DEBUG INFO ===');
if (rfq) {
  console.log('RFQ Data:', {
    id: rfq._id,
    title: rfq.title,
    itemsCount: rfq.items?.length,
    quotesCount: rfq.quotes?.length,
    items: rfq.items?.map(item => ({
      productText: item.productText,
      productId: item.productId, 
      quantity: item.quantity,
      uom: item.uom
    })),
    quotes: rfq.quotes?.map(quote => ({
      id: quote._id,
      supplierName: quote.supplierName,
      itemsCount: quote.items?.length,
      items: quote.items?.map(qItem => ({
        productText: qItem.productText,
        productId: qItem.productId,
        unitPrice: qItem.unitPrice
      }))
    }))
  });
  
  console.log('Generated Columns:', columns);
  console.log('Generated Rows:', rows);
}
console.log('=== END DEBUG INFO ===');
