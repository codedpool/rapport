import Image from "next/image";

// App page header: title on the left, the whole illustration framed on the right.
// The picture keeps its own shape (ratio) so nothing in it is cut off.
export default function PageHeader({ title, subtitle, image, ratio = "4 / 3", alt = "", children }) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
      <div className="card !border-white !bg-[#fffaf3] rounded-[1.75rem] p-3 flex items-stretch gap-3">
        <div className="flex-1 min-w-0 px-4 sm:px-7 py-7 sm:py-9 flex flex-col justify-center">
          <h1 className="display display-tight text-4xl sm:text-5xl text-accent">{title}</h1>
          {subtitle && <p className="mt-3 text-lg text-ink-2 max-w-xl">{subtitle}</p>}
          {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
        </div>
        {image && (
          <div className="hidden md:block relative shrink-0 h-[13.5rem] lg:h-[15rem] rounded-[1.35rem] overflow-hidden"
            style={{ aspectRatio: ratio }}>
            <Image src={image} alt={alt} fill sizes="(min-width: 1024px) 320px, 290px" priority className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
