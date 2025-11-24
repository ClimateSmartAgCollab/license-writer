import drtLogo from "@/assets/DRT_logo.png";


interface HeaderProps {
  title?: string;
  homepageUrl?: string;
}

export default function Header({ 
  title = "License Template Builder",
  homepageUrl = "https://drt-test.canadacentral.cloudapp.azure.com/"
}: HeaderProps) {
  return (
    <header className="flex items-center sticky bg-[var(--drt-green)] text-white pb-12 pl-6 w-full border-b-[3px] border-b-[var(--drt-green-dark)]">
      <a
        href={homepageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="transition-opacity hover:opacity-80 cursor-pointer"
        aria-label="Go to homepage"
      >
        <img
          src={drtLogo}
          className="h-32 w-32 mr-8 inline-block"
          alt="DRT logo"
        />
      </a>
      <h1 className="text-4xl font-semibold">{title}</h1>
    </header>
  );
}

