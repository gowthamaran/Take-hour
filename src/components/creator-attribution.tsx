export function CreatorAttribution() {
  return (
    <a
      href="https://x.com/themaran"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-secondary hover:text-ink"
    >
      <span>Built by</span>
      <img
        src="/themaran-pfp.jpg"
        alt=""
        width={24}
        height={24}
        className="size-6 rounded-full object-cover"
      />
      <span>@TheMaran</span>
    </a>
  );
}
