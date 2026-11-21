import { countryFlag } from "../lib/countries";

export default function CountryFlag({ country, className = "" }: { country?: string | null; className?: string }) {
    const flag = countryFlag(country);
    if (!flag) return null;
    return <span aria-label={country || undefined} title={country || undefined} className={className}>{flag}</span>;
}
