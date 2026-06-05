import { clsx } from 'clsx';

export function BrandLogo({
  size = 'md',
  showName = true,
  inverse = false,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  const imageSize = {
    sm: 'h-9 w-9 rounded-xl',
    md: 'h-11 w-11 rounded-2xl',
    lg: 'h-14 w-14 rounded-[18px]',
  }[size];

  const nameSize = {
    sm: 'text-lg',
    md: 'text-lg',
    lg: 'text-xl',
  }[size];

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <img
        src="/icons/icon-192.png?v=3"
        alt=""
        className={clsx(imageSize, 'shrink-0 object-cover shadow-[0_10px_24px_rgba(76,43,211,0.24)]')}
      />
      {showName ? <span className={clsx('app-wordmark', nameSize, inverse ? 'text-white' : 'text-ink')}>SaveLah</span> : null}
    </div>
  );
}
