import Image from "next/image";
import logo from "../../public/brand/logo.png";

/** The Smart Servicing Centre badge (from the Laravel site's finallogo.png). Height is set by className. */
export function Logo({ className = "h-12" }: { className?: string }) {
  return <Image src={logo} alt="Smart Servicing Centre" className={`w-auto ${className}`} priority />;
}
