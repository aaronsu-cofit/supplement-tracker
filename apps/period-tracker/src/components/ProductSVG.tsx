import React from 'react'

interface ProductSVGProps {
  type: string
  level: string
}

const assetMap: Record<string, Record<string, string>> = {
  pad: {
    light: '/assets/icons/pad_status_light.png',
    medium: '/assets/icons/pad_status_medium.png',
    heavy: '/assets/icons/pad_status_heavy.png',
  },
  tampon: {
    light: '/assets/icons/tampon_status_light.png',
    medium: '/assets/icons/tampon_status_medium.png',
    heavy: '/assets/icons/tampon_status_heavy.png',
  },
  cup: {
    light: '/assets/icons/cap_status_light.png',
    medium: '/assets/icons/cap_status_medium.png',
    heavy: '/assets/icons/cap_status_heavy.png',
  },
}

export const ProductSVG: React.FC<ProductSVGProps> = ({ type, level }) => {
  const src = assetMap[type]?.[level]

  if (!src) return null

  return (
    <img
      src={src}
      style={{ width: '65px', height: '36px', objectFit: 'contain' }}
      alt={`${type} ${level}`}
    />
  )
}
