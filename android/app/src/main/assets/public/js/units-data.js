/*!
 * N-Calc · units-data.js — AUTO-GENERATED, do not edit by hand.
 * Source of truth: data/*.json  ·  rebuild with: npm run build:data
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NC_UNITS_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    "generatedBy": "scripts/build-data.js",
    "categories": [
      {
        "id": "length",
        "title": "Length",
        "order": 2,
        "kind": "factor",
        "base": "Meter",
        "units": {
          "Meter": {
            "symbol": "m",
            "factor": 1
          },
          "Kilometer": {
            "symbol": "km",
            "factor": 1000
          },
          "Centimeter": {
            "symbol": "cm",
            "factor": 0.01
          },
          "Millimeter": {
            "symbol": "mm",
            "factor": 0.001
          },
          "Micrometer": {
            "symbol": "µm",
            "factor": 0.000001
          },
          "Nanometer": {
            "symbol": "nm",
            "factor": 1e-9
          },
          "Mile": {
            "symbol": "mi",
            "factor": 1609.344
          },
          "Yard": {
            "symbol": "yd",
            "factor": 0.9144
          },
          "Foot": {
            "symbol": "ft",
            "factor": 0.3048
          },
          "Inch": {
            "symbol": "in",
            "factor": 0.0254
          },
          "Nautical mile": {
            "symbol": "nmi",
            "factor": 1852
          },
          "Light year": {
            "symbol": "ly",
            "factor": 9460730472580800
          },
          "Astronomical unit": {
            "symbol": "AU",
            "factor": 149597870700
          }
        }
      },
      {
        "id": "mass",
        "title": "Mass",
        "order": 3,
        "kind": "factor",
        "base": "Kilogram",
        "units": {
          "Kilogram": {
            "symbol": "kg",
            "factor": 1
          },
          "Gram": {
            "symbol": "g",
            "factor": 0.001
          },
          "Milligram": {
            "symbol": "mg",
            "factor": 0.000001
          },
          "Microgram": {
            "symbol": "µg",
            "factor": 1e-9
          },
          "Tonne": {
            "symbol": "t",
            "factor": 1000
          },
          "Pound": {
            "symbol": "lb",
            "factor": 0.45359237
          },
          "Ounce": {
            "symbol": "oz",
            "factor": 0.028349523125
          },
          "Stone": {
            "symbol": "st",
            "factor": 6.35029318
          }
        }
      },
      {
        "id": "speed",
        "title": "Speed",
        "order": 4,
        "kind": "factor",
        "base": "Meter/second",
        "units": {
          "Meter/second": {
            "symbol": "m/s",
            "factor": 1
          },
          "Kilometer/hour": {
            "symbol": "km/h",
            "factor": 0.2777777777777778
          },
          "Mile/hour": {
            "symbol": "mph",
            "factor": 0.44704
          },
          "Foot/second": {
            "symbol": "ft/s",
            "factor": 0.3048
          },
          "Knot": {
            "symbol": "kn",
            "factor": 0.5144444444444445
          },
          "Mach": {
            "symbol": "Ma",
            "factor": 340.29
          }
        }
      },
      {
        "id": "volume",
        "title": "Volume",
        "order": 5,
        "kind": "factor",
        "base": "Liter",
        "units": {
          "Liter": {
            "symbol": "L",
            "factor": 1
          },
          "Milliliter": {
            "symbol": "mL",
            "factor": 0.001
          },
          "Cubic meter": {
            "symbol": "m³",
            "factor": 1000
          },
          "Cubic centimeter": {
            "symbol": "cm³",
            "factor": 0.001
          },
          "Cubic inch": {
            "symbol": "in³",
            "factor": 0.016387064
          },
          "Cubic foot": {
            "symbol": "ft³",
            "factor": 28.316846592
          },
          "Gallon (US)": {
            "symbol": "gal",
            "factor": 3.785411784
          },
          "Quart (US)": {
            "symbol": "qt",
            "factor": 0.946352946
          },
          "Pint (US)": {
            "symbol": "pt",
            "factor": 0.473176473
          },
          "Cup (US)": {
            "symbol": "cup",
            "factor": 0.2365882365
          },
          "Fluid ounce (US)": {
            "symbol": "fl oz",
            "factor": 0.0295735295625
          },
          "Tablespoon (US)": {
            "symbol": "tbsp",
            "factor": 0.01478676478125
          },
          "Teaspoon (US)": {
            "symbol": "tsp",
            "factor": 0.00492892159375
          },
          "Gallon (Imperial)": {
            "symbol": "imp gal",
            "factor": 4.54609
          }
        }
      },
      {
        "id": "area",
        "title": "Area",
        "order": 6,
        "kind": "factor",
        "base": "Square meter",
        "units": {
          "Square meter": {
            "symbol": "m²",
            "factor": 1
          },
          "Square kilometer": {
            "symbol": "km²",
            "factor": 1000000
          },
          "Square centimeter": {
            "symbol": "cm²",
            "factor": 0.0001
          },
          "Square millimeter": {
            "symbol": "mm²",
            "factor": 0.000001
          },
          "Hectare": {
            "symbol": "ha",
            "factor": 10000
          },
          "Acre": {
            "symbol": "ac",
            "factor": 4046.8564224
          },
          "Square mile": {
            "symbol": "mi²",
            "factor": 2589988.110336
          },
          "Square yard": {
            "symbol": "yd²",
            "factor": 0.83612736
          },
          "Square foot": {
            "symbol": "ft²",
            "factor": 0.09290304
          },
          "Square inch": {
            "symbol": "in²",
            "factor": 0.00064516
          }
        }
      },
      {
        "id": "data",
        "title": "Data",
        "order": 7,
        "kind": "factor",
        "base": "Byte",
        "units": {
          "Bit": {
            "symbol": "b",
            "factor": 0.125
          },
          "Byte": {
            "symbol": "B",
            "factor": 1
          },
          "Kilobyte": {
            "symbol": "kB",
            "factor": 1000
          },
          "Kibibyte": {
            "symbol": "KiB",
            "factor": 1024
          },
          "Megabyte": {
            "symbol": "MB",
            "factor": 1000000
          },
          "Mebibyte": {
            "symbol": "MiB",
            "factor": 1048576
          },
          "Gigabyte": {
            "symbol": "GB",
            "factor": 1000000000
          },
          "Gibibyte": {
            "symbol": "GiB",
            "factor": 1073741824
          },
          "Terabyte": {
            "symbol": "TB",
            "factor": 1000000000000
          },
          "Tebibyte": {
            "symbol": "TiB",
            "factor": 1099511627776
          },
          "Petabyte": {
            "symbol": "PB",
            "factor": 1000000000000000
          },
          "Pebibyte": {
            "symbol": "PiB",
            "factor": 1125899906842624
          }
        }
      },
      {
        "id": "time",
        "title": "Time",
        "order": 8,
        "kind": "factor",
        "base": "Second",
        "units": {
          "Nanosecond": {
            "symbol": "ns",
            "factor": 1e-9
          },
          "Microsecond": {
            "symbol": "µs",
            "factor": 0.000001
          },
          "Millisecond": {
            "symbol": "ms",
            "factor": 0.001
          },
          "Second": {
            "symbol": "s",
            "factor": 1
          },
          "Minute": {
            "symbol": "min",
            "factor": 60
          },
          "Hour": {
            "symbol": "h",
            "factor": 3600
          },
          "Day": {
            "symbol": "d",
            "factor": 86400
          },
          "Week": {
            "symbol": "wk",
            "factor": 604800
          },
          "Month": {
            "symbol": "mo",
            "factor": 2629746
          },
          "Year": {
            "symbol": "yr",
            "factor": 31556952
          }
        }
      },
      {
        "id": "temp",
        "title": "Temp",
        "order": 9,
        "kind": "temperature",
        "base": "Celsius",
        "units": {
          "Celsius": {
            "symbol": "°C"
          },
          "Fahrenheit": {
            "symbol": "°F"
          },
          "Kelvin": {
            "symbol": "K"
          }
        }
      }
    ],
    "currencyNames": {
      "AED": "United Arab Emirates Dirham",
      "AFN": "Afghan Afghani",
      "ALL": "Albanian Lek",
      "AMD": "Armenian Dram",
      "ANG": "Netherlands Antillean Guilder",
      "AOA": "Angolan Kwanza",
      "ARS": "Argentine Peso",
      "AUD": "Australian Dollar",
      "AWG": "Aruban Florin",
      "AZN": "Azerbaijani Manat",
      "BAM": "Bosnia-Herzegovina Convertible Mark",
      "BBD": "Barbadian Dollar",
      "BDT": "Bangladeshi Taka",
      "BGN": "Bulgarian Lev",
      "BHD": "Bahraini Dinar",
      "BIF": "Burundian Franc",
      "BMD": "Bermudian Dollar",
      "BND": "Brunei Dollar",
      "BOB": "Bolivian Boliviano",
      "BRL": "Brazilian Real",
      "BSD": "Bahamian Dollar",
      "BTN": "Bhutanese Ngultrum",
      "BWP": "Botswana Pula",
      "BYN": "Belarusian Ruble",
      "BZD": "Belize Dollar",
      "CAD": "Canadian Dollar",
      "CDF": "Congolese Franc",
      "CHF": "Swiss Franc",
      "CLP": "Chilean Peso",
      "CNY": "Chinese Yuan",
      "COP": "Colombian Peso",
      "CRC": "Costa Rican Colón",
      "CUP": "Cuban Peso",
      "CVE": "Cape Verdean Escudo",
      "CZK": "Czech Koruna",
      "DJF": "Djiboutian Franc",
      "DKK": "Danish Krone",
      "DOP": "Dominican Peso",
      "DZD": "Algerian Dinar",
      "EGP": "Egyptian Pound",
      "ERN": "Eritrean Nakfa",
      "ETB": "Ethiopian Birr",
      "EUR": "Euro",
      "FJD": "Fijian Dollar",
      "FKP": "Falkland Islands Pound",
      "FOK": "Faroese Króna",
      "GBP": "British Pound Sterling",
      "GEL": "Georgian Lari",
      "GGP": "Guernsey Pound",
      "GHS": "Ghanaian Cedi",
      "GIP": "Gibraltar Pound",
      "GMD": "Gambian Dalasi",
      "GNF": "Guinean Franc",
      "GTQ": "Guatemalan Quetzal",
      "GYD": "Guyanese Dollar",
      "HKD": "Hong Kong Dollar",
      "HNL": "Honduran Lempira",
      "HRK": "Croatian Kuna",
      "HTG": "Haitian Gourde",
      "HUF": "Hungarian Forint",
      "IDR": "Indonesian Rupiah",
      "ILS": "Israeli New Shekel",
      "IMP": "Isle of Man Pound",
      "INR": "Indian Rupee",
      "IQD": "Iraqi Dinar",
      "IRR": "Iranian Rial",
      "ISK": "Icelandic Króna",
      "JEP": "Jersey Pound",
      "JMD": "Jamaican Dollar",
      "JOD": "Jordanian Dinar",
      "JPY": "Japanese Yen",
      "KES": "Kenyan Shilling",
      "KGS": "Kyrgyzstani Som",
      "KHR": "Cambodian Riel",
      "KID": "Kiribati Dollar",
      "KMF": "Comorian Franc",
      "KRW": "South Korean Won",
      "KWD": "Kuwaiti Dinar",
      "KYD": "Cayman Islands Dollar",
      "KZT": "Kazakhstani Tenge",
      "LAK": "Laotian Kip",
      "LBP": "Lebanese Pound",
      "LKR": "Sri Lankan Rupee",
      "LRD": "Liberian Dollar",
      "LSL": "Lesotho Loti",
      "LYD": "Libyan Dinar",
      "MAD": "Moroccan Dirham",
      "MDL": "Moldovan Leu",
      "MGA": "Malagasy Ariary",
      "MKD": "Macedonian Denar",
      "MMK": "Myanmar Kyat",
      "MNT": "Mongolian Tögrög",
      "MOP": "Macanese Pataca",
      "MRU": "Mauritanian Ouguiya",
      "MUR": "Mauritian Rupee",
      "MVR": "Maldivian Rufiyaa",
      "MWK": "Malawian Kwacha",
      "MXN": "Mexican Peso",
      "MYR": "Malaysian Ringgit",
      "MZN": "Mozambican Metical",
      "NAD": "Namibian Dollar",
      "NGN": "Nigerian Naira",
      "NIO": "Nicaraguan Córdoba",
      "NOK": "Norwegian Krone",
      "NPR": "Nepalese Rupee",
      "NZD": "New Zealand Dollar",
      "OMR": "Omani Rial",
      "PAB": "Panamanian Balboa",
      "PEN": "Peruvian Sol",
      "PGK": "Papua New Guinean Kina",
      "PHP": "Philippine Peso",
      "PKR": "Pakistani Rupee",
      "PLN": "Polish Zloty",
      "PYG": "Paraguayan Guaraní",
      "QAR": "Qatari Riyal",
      "RON": "Romanian Leu",
      "RSD": "Serbian Dinar",
      "RUB": "Russian Ruble",
      "RWF": "Rwandan Franc",
      "SAR": "Saudi Riyal",
      "SBD": "Solomon Islands Dollar",
      "SCR": "Seychellois Rupee",
      "SDG": "Sudanese Pound",
      "SEK": "Swedish Krona",
      "SGD": "Singapore Dollar",
      "SHP": "Saint Helena Pound",
      "SLE": "Sierra Leonean Leone",
      "SOS": "Somali Shilling",
      "SRD": "Surinamese Dollar",
      "SSP": "South Sudanese Pound",
      "STN": "São Tomé and Príncipe Dobra",
      "SYP": "Syrian Pound",
      "SZL": "Eswatini Lilangeni",
      "THB": "Thai Baht",
      "TJS": "Tajikistani Somoni",
      "TMT": "Turkmenistani Manat",
      "TND": "Tunisian Dinar",
      "TOP": "Tongan Paʻanga",
      "TRY": "Turkish Lira",
      "TTD": "Trinidad and Tobago Dollar",
      "TVD": "Tuvaluan Dollar",
      "TWD": "New Taiwan Dollar",
      "TZS": "Tanzanian Shilling",
      "UAH": "Ukrainian Hryvnia",
      "UGX": "Ugandan Shilling",
      "USD": "United States Dollar",
      "UYU": "Uruguayan Peso",
      "UZS": "Uzbekistani So'm",
      "VES": "Venezuelan Bolívar",
      "VND": "Vietnamese Dong",
      "VUV": "Vanuatu Vatu",
      "WST": "Samoan Tala",
      "XAF": "Central African CFA Franc",
      "XCD": "East Caribbean Dollar",
      "XDR": "IMF Special Drawing Rights",
      "XOF": "West African CFA Franc",
      "XPF": "CFP Franc",
      "YER": "Yemeni Rial",
      "ZAR": "South African Rand",
      "ZMW": "Zambian Kwacha",
      "ZWL": "Zimbabwean Dollar"
    },
    "rateSnapshot": {
      "_comment": "Offline fallback rates (USD base). Released builds refresh this from the live API. Used only when every network source is unreachable — the app labels it as an estimate.",
      "date": null,
      "estimated": true,
      "base": "USD",
      "rates": {
        "USD": 1,
        "EUR": 0.92,
        "GBP": 0.79,
        "JPY": 151,
        "CNY": 7.2,
        "INR": 84,
        "AUD": 1.5,
        "CAD": 1.36,
        "CHF": 0.88,
        "NZD": 1.62,
        "SEK": 10.5,
        "NOK": 10.7,
        "DKK": 6.85,
        "PLN": 4,
        "CZK": 23,
        "HUF": 360,
        "RUB": 92,
        "TRY": 32,
        "BRL": 5,
        "MXN": 17,
        "ZAR": 18.5,
        "SGD": 1.34,
        "HKD": 7.8,
        "KRW": 1330,
        "THB": 36,
        "MYR": 4.7,
        "IDR": 15600,
        "PHP": 56,
        "VND": 24500,
        "AED": 3.67,
        "SAR": 3.75,
        "ILS": 3.7,
        "EGP": 47,
        "NGN": 1500,
        "PKR": 278,
        "BDT": 110,
        "LKR": 300,
        "KES": 130,
        "UAH": 39,
        "ARS": 850,
        "CLP": 950,
        "COP": 3900,
        "PEN": 3.7,
        "TWD": 32
      }
    }
  };
});
