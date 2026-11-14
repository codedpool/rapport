import Image from "next/image";

// App page header: a slim photo band with the page title over it.
export default function PageHeader({ title, subtitle, image = "/images/studio.jpg", children }) {
  return (
    <section className="relative overflow-hidden bg-night text-white">
      <Image src={image} alt="" fill sizes="100vw" className="object-cover opacity-35" priority />
      <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/30" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="display display-tight text-4xl sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 text-lg text-white/80 max-w-2xl">{subtitle}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
