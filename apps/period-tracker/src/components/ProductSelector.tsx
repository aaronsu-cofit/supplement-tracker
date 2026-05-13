import React from 'react'
import { PRODUCTS } from '@repo/utils'

interface ProductSelectorProps {
  selectedProduct: 'pad' | 'tampon' | 'cup'
  onSelect: (product: 'pad' | 'tampon' | 'cup') => void
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({ selectedProduct, onSelect }) => {
  return (
    <div className="pbac-product-row">
      {PRODUCTS.map((p) => (
        <div
          key={p.id}
          className={`pbac-product-btn ${selectedProduct === p.id ? 'on' : ''}`}
          onClick={() => onSelect(p.id as any)}
        >
          <img src={p.icon} className="pbac-product-icon-img" alt={p.label} />
          <div className="pbac-product-label">{p.label}</div>
        </div>
      ))}
    </div>
  )
}
