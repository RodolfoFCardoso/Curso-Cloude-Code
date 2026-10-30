import Image from 'next/image';

/**
 * O telão: a imagem emoldurada em proporção de cinema, com a luz "vazando" para o veludo
 * abaixo (uma cópia desfocada da própria imagem).
 */
export function Screen({
  src,
  imageClassName = '',
  className = '',
  priority = false,
}: {
  src: string;
  /** Classe de animação da imagem (ex.: projetor acendendo). */
  imageClassName?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative isolate ${className}`}>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-[4%] top-[35%] -bottom-[22%] -z-10 opacity-60 ${imageClassName}`}
      >
        {/* O blur fica na imagem: a animação do projetor usa `filter` no contêiner. */}
        <Image
          src={src}
          alt=""
          fill
          sizes="320px"
          className="object-cover blur-[64px] saturate-150"
        />
      </div>
      <div className="relative aspect-video overflow-hidden rounded-[3px] bg-poltrona shadow-[0_50px_120px_-50px_rgba(0,0,0,0.95)] ring-1 ring-tela/10 lg:aspect-[2.39/1]">
        <div className={`absolute inset-0 ${imageClassName}`}>
          <Image
            src={src.replace('/w1280/', '/original/')}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 75vw, 100vw"
            className="object-cover object-[50%_25%]"
          />
        </div>
        {/* Bordas do telão escurecem, como a luz do projetor caindo nos cantos. */}
        <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(10,4,7,0.65)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-veludo/80 to-transparent" />
      </div>
    </div>
  );
}
