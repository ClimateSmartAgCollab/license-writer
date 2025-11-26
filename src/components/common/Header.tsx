import drtLogo from "@/assets/DRT_logo.png";

interface HeaderProps {
  title?: string;
  homepageUrl?: string;
}

export default function Header({
  title = "License Template Builder",
  homepageUrl = "https://drt-test.canadacentral.cloudapp.azure.com/",
}: HeaderProps) {
  return (
    <header className="flex items-center sticky bg-[var(--drt-green)] text-white pb-6 lg:pb-12 pl-3 lg:pl-6 pr-3 lg:pr-6 w-full border-b-[3px] border-b-[var(--drt-green-dark)]">
      <a
        href={homepageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-80 cursor-pointer flex-shrink-0"
        aria-label="Go to homepage"
      >
        <img
          src={drtLogo}
          className="h-16 w-16 lg:h-32 lg:w-32 mr-3 lg:mr-8 inline-block"
          alt="DRT logo"
        />
      </a>
      <h1 className="text-lg lg:text-4xl font-semibold truncate">{title}</h1>
    </header>
  );
}
