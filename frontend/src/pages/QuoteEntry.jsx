import React from 'react';  
import QuoteEntryPrototype from '../components/quotes/QuoteEntryPrototype.jsx';  
  
export default function QuoteEntry({ editQuoteId = null }) {  
  return <QuoteEntryPrototype editQuoteId={editQuoteId} />;  
} 
