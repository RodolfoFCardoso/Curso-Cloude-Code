import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * Imagem de fundo de ponta a ponta, com o conteúdo por cima no canto inferior esquerdo.
 * A sala escura "come" a imagem pela esquerda e por baixo; um brilho verde sobe do chão.
 */
export function Billboard({
  src,
  imageClassName = '',
  priority = false,
  overlapNext = false,
  children,
}: {
  src: string;
  /** Classe de animação da imagem (ex.: projetor acendendo). */
  imageClassName?: string;
  priority?: boolean;
  /** Deixa espaço embaixo para o trilho seguinte subir sobre a imagem (telas grandes). */
  overlapNext?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-[560px] items-end overflow-hidden bg-veludo sm:min-h-[620px] lg:h-[min(56.25vw,88vh)]">
      <div className={`absolute inset-0 -z-10 ${imageClassName}`}>
        <Image
          src={src.replace('/w1280/', '/original/')}
          alt=""
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover object-[60%_20%]"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-veludo via-veludo/60 to-transparent lg:via-veludo/40 lg:to-75%"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_15%_100%,rgba(30,122,79,0.42),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-veludo to-transparent"
      />
      <div
        className={`w-full px-4 pt-28 pb-12 sm:px-10 sm:pb-16 ${overlapNext ? 'lg:pb-[13vw]' : 'lg:pb-20'}`}
      >
        {children}
      </div>
    </div>
  );
}
