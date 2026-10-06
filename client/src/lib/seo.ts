export function setPageSeo(options: { title: string; description: string; image?: string; noindex?: boolean; jsonLd?: Record<string, unknown> }) {
  if (typeof document === "undefined") return;
  document.title = options.title;
  const setMeta = (selector: string, attributes: Record<string, string>) => {
    let element = document.head.querySelector(selector) as HTMLMetaElement | null;
    if (!element) {
      element = document.createElement("meta");
      document.head.appendChild(element);
    }
    Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value));
  };
  setMeta('meta[name="description"]', { name: "description", content: options.description });
  setMeta('meta[name="robots"]', { name: "robots", content: options.noindex ? "noindex,nofollow" : "index,follow" });
  setMeta('meta[property="og:title"]', { property: "og:title", content: options.title });
  setMeta('meta[property="og:description"]', { property: "og:description", content: options.description });
  setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
  if (options.image) setMeta('meta[property="og:image"]', { property: "og:image", content: options.image });
  setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
  setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: options.title });
  setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: options.description });
  if (options.image) setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: options.image });
  const configuredOrigin = import.meta.env.VITE_PUBLIC_ORIGIN as string | undefined;
  const canonical = configuredOrigin ? `${configuredOrigin}${window.location.pathname}` : null;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (canonical) {
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = canonical;
  } else if (link) {
    link.remove();
  }
  const existingLd = document.getElementById("shoehub-jsonld");
  if (existingLd) existingLd.remove();
  if (options.jsonLd) {
    const script = document.createElement("script");
    script.id = "shoehub-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(options.jsonLd);
    document.head.appendChild(script);
  }
}
