import Image from "next/image";

// App page header: a cream band with an illustration fading in from the right.
export default function PageHeader({ title, subtitle, image = "/images/sunset.webp", children }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
      <div className="relative overflow-hidden rounded-[1.75rem] card !border-white min-h-[13rem]">
        <Image src={image} alt="" fill sizes="(min-width: 1024px) 70vw, 100vw" priority
          className="object-cover object-right" />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,243,0.97)_0%,rgba(255,250,243,0.9)_42%,rgba(255,250,243,0.15)_78%)]" />
        <div className="relative px-6 sm:px-10 py-10 sm:py-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="display display-tight text-4xl sm:text-5xl text-accent">{title}</h1>
            {subtitle && <p className="mt-3 text-lg text-ink-2">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
