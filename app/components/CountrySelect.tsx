"use client";

import { africanCountries, countryFlag } from "../lib/countries";

export default function CountrySelect({
    value,
    onChange,
    className,
    placeholder = "Choose your country (optional)",
}: {
    value: string;
    onChange: (value: string) => void;
    className: string;
    placeholder?: string;
}) {
    return (
        <select value={value} onChange={(event) => onChange(event.target.value)} className={className}>
            <option value="">{placeholder}</option>
            {africanCountries.map((country) => <option key={country.code} value={country.name}>{countryFlag(country.name)} {country.name}</option>)}
            <option value="Other">🌍 Other / outside Africa</option>
        </select>
    );
}
