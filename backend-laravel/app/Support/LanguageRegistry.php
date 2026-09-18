<?php

namespace App\Support;

class LanguageRegistry
{
    /**
     * Northeast India language registry matching 2025 WMT low-resource Indic task & AI4Bharat.
     */
    protected static array $languages = [
        ['id' => 'en-IN', 'name' => 'English', 'native' => 'English', 'state' => 'All', 'status' => 'implemented', 'pairs' => '—'],
        ['id' => 'as-IN', 'name' => 'Assamese', 'native' => 'অসমীয়া', 'state' => 'Assam', 'status' => 'implemented', 'pairs' => '54,000'],
        ['id' => 'bn-IN', 'name' => 'Bengali', 'native' => 'বাংলা', 'state' => 'Assam / Tripura', 'status' => 'implemented', 'pairs' => '8M+'],
        ['id' => 'hi-IN', 'name' => 'Hindi', 'native' => 'हिन्दी', 'state' => 'Northeast / All', 'status' => 'implemented', 'pairs' => '8M+'],
        ['id' => 'mni-IN', 'name' => 'Meitei (Manipuri)', 'native' => 'ꯃꯤꯇꯩꯂꯣꯟ', 'state' => 'Manipur', 'status' => 'implemented', 'pairs' => '23,687'],
        ['id' => 'kha-IN', 'name' => 'Khasi', 'native' => 'Khasi', 'state' => 'Meghalaya', 'status' => 'implemented', 'pairs' => '26,000'],
        ['id' => 'lus-IN', 'name' => 'Mizo', 'native' => 'Mizo', 'state' => 'Mizoram', 'status' => 'implemented', 'pairs' => '50,000'],
        ['id' => 'njz-IN', 'name' => 'Nyishi', 'native' => 'Nyishi', 'state' => 'Arunachal Pradesh', 'status' => 'implemented', 'pairs' => '60,000'],
        ['id' => 'brx-IN', 'name' => 'Bodo', 'native' => 'बड़ो', 'state' => 'Assam', 'status' => 'planned', 'pairs' => '15,215'],
        ['id' => 'gar-IN', 'name' => 'Garo', 'native' => 'A·chik', 'state' => 'Meghalaya', 'status' => 'planned', 'pairs' => '2,500'],
        ['id' => 'nag-IN', 'name' => 'Nagamese', 'native' => 'Nagamese', 'state' => 'Nagaland', 'status' => 'planned', 'pairs' => '—'],
        ['id' => 'trp-IN', 'name' => 'Kokborok', 'native' => 'Kokborok', 'state' => 'Tripura', 'status' => 'planned', 'pairs' => '2,269'],
    ];

    public static function all(): array
    {
        return self::$languages;
    }

    public static function implemented(): array
    {
        return array_values(array_filter(self::$languages, fn($l) => $l['status'] === 'implemented'));
    }

    public static function getLanguage(string $id): ?array
    {
        foreach (self::$languages as $lang) {
            if ($lang['id'] === $id) {
                return $lang;
            }
        }
        return null;
    }

    public static function isValid(string $id): bool
    {
        return self::getLanguage($id) !== null;
    }
}
