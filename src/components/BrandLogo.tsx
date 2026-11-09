import React, { useId } from 'react';

type BrandLogoProps = {
  mode?: 'dark' | 'light';
  size?: number;
  wordmarkSize?: number;
  showWordmark?: boolean;
  className?: string;
};

const BrandLogo: React.FC<BrandLogoProps> = ({
  mode = 'dark',
  size = 32,
  wordmarkSize = 24,
  showWordmark = true,
  className = '',
}) => {
  const gradientId = useId();
  const textColor = mode === 'light' ? '#ffffff' : 'var(--text-h)';

  return (
    <span
      className={`brand-logo ${className}`.trim()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        lineHeight: 1,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 220 320"
        aria-hidden="true"
        className="brand-logo-mark"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#5b6cff" />
            <stop offset="50%" stopColor="#4d5ce8" />
            <stop offset="100%" stopColor="#3b49d8" />
          </linearGradient>
        </defs>

        <path
          d="M177 28C143 11 98 10 62 28C29 45 10 73 12 108C14 142 39 163 75 175L116 189C143 198 155 212 154 230C153 251 134 267 101 267C69 267 43 257 20 236L7 252C30 286 67 308 108 310C150 313 187 295 206 265C223 237 219 200 191 179L147 150C120 130 103 120 90 107C76 95 72 81 79 70C87 58 102 52 122 52C147 52 167 66 181 86L188 74C182 49 186 36 177 28Z"
          fill={`url(#${gradientId})`}
        />
      </svg>

      {showWordmark && (
        <span
          className="brand-logo-wordmark"
          style={{
            color: textColor,
            fontSize: `${wordmarkSize}px`,
            fontWeight: 900,
            letterSpacing: '-0.08em',
            lineHeight: 1,
            transform: 'translateY(-2px)',
          }}
        >
          Stride
        </span>
      )}
    </span>
  );
};

export default BrandLogo;
