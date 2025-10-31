import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Form,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Alert,
  InputNumber,
  Switch,
  // Divider,
  Row,
  Col,
  Upload,
  message,
  Spin,
  Card
} from "antd";
import { UploadOutlined, LoadingOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { languages } from "../../../constant/languages";
import {
  useCompanyControllerGetCompany,
  usePackageControllerCreatePackage,
  usePackageControllerUpdatePackage,
  usePackageControllerGetPackageTags,
} from "../../../lib/client/api";
import { useSession } from "next-auth/react";
import { TranslationOutlined } from "@ant-design/icons";
import useTemplateStore from "@/lib/zustand/store/templateStore";
import { useSearchParams } from "next/navigation";

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Separate interfaces for better type safety
interface NonMultilingualFields {
  packageCode: string;
  originalPrice: number;
  discountedPrice?: number;
  includesTax: boolean;
  taxPercentage?: number;
  active: boolean;
  roomUpgrade: boolean;
  from_category_id?: number;
  to_category_id?: number;
  incentivePercentage?: number;
  companyId?: number;
  templateId?: number;
  totalPackagesSold?: number;
  calculationMethod: string;
}

interface MultilingualFields {
  packageName: string;
  packageDescription?: string;
  packageBenefits: string[];
  packageTags: string[];
  taxInformation?: string;
  currency: string;
  packageAlert?: string;
  buttonText: string;
  soldOutText?: string;
  purchaseText?: string;
  popularityText?: string;
  priceAlgorithms: string;
}

interface LanguageCard {
  id: string;
  langCode: string;
  data: MultilingualFields;
  benefits: string[];
  tags: string[];
  newBenefit: string;
  newTag: string;
}

interface CreatePackageFormFieldValues extends NonMultilingualFields {
  languageCards: LanguageCard[];
}

const CALCULATION_METHODS = [
  { value: "PRICE_PER_NIGHT", label: "Price per night" },
  { value: "PRICE_PER_STAY", label: "Price per stay" },
  { value: "PRICE_PER_PERSON_PER_NIGHT", label: "Price per person per night" },
  { value: "PRICE_PER_ADULT_PER_NIGHT", label: "Price per adult per night" },
  { value: "PRICE_PER_CHILD_PER_NIGHT", label: "Price per child per night" },
  { value: "PRICE_PER_PERSON_PER_STAY", label: "Price per person per stay" },
  { value: "PRICE_PER_PIECE", label: "Price per piece" },
];

// Schema for non-multilingual fields
const nonMultilingualSchema = yup.object().shape({
  packageCode: yup.string().required("Package code is required").max(50, "Package code must be at most 50 characters"),
  originalPrice: yup.number().required("Original price is required").min(0, "Price must be positive"),
  discountedPrice: yup.number().min(0, "Discounted price must be positive"),
  includesTax: yup.boolean().required(),
  taxPercentage: yup.number().min(0).max(100, "Tax percentage must be between 0-100"),
  active: yup.boolean().required(),
  roomUpgrade: yup.boolean().required(),
  from_category_id: yup.number().when('roomUpgrade', {
    is: true,
    then: (schema) => schema.required("From category is required when room upgrade is enabled"),
    otherwise: (schema) => schema.notRequired().nullable()
  }),
  to_category_id: yup.number().when('roomUpgrade', {
    is: true,
    then: (schema) => schema.required("To category is required when room upgrade is enabled"),
    otherwise: (schema) => schema.notRequired().nullable()
  }),
  incentivePercentage: yup.number().min(0).max(100, "Incentive percentage must be between 0-100"),
  totalPackagesSold: yup.number().min(0, "Total packages sold must be a non-negative number"),
  calculationMethod: yup.string().required("Calculation method is required").oneOf(
    CALCULATION_METHODS.map(method => method.value),
    "Invalid calculation method"
  ),
});

// Schema for multilingual fields
const multilingualSchema = yup.object().shape({
  // packageName: yup.string().required("Package name is required").max(100, "Name must be at most 100 characters"),
  packageDescription: yup.string().max(1000, "Description must be at most 1000 characters"),
  taxInformation: yup.string().max(500, "Tax information must be at most 500 characters"),
  // currency: yup.string().required("Currency is required"),
  packageAlert: yup.string().max(200, "Alert text must be at most 200 characters"),
  // buttonText: yup.string().required("Button text is required").max(50, "Button text must be at most 50 characters"),
  soldOutText: yup.string().max(100, "Sold out text must be at most 100 characters"),
  purchaseText: yup.string().max(100, "purchaseText  text must be at most 100 characters"),
  popularityText: yup.string().max(100, "Popularity text must be at most 100 characters"),
  // priceAlgorithms: yup.string().required("Price algorithm is required"),
});

// Combined schema
const schema = nonMultilingualSchema.shape({
  languageCards: yup.array()
    .of(yup.object().shape({
      id: yup.string().required(),
      langCode: yup.string().required("Language is required"),
      data: multilingualSchema
    }))
    .min(1, "At least one language is required")
    .required("Language cards are required"),
});

interface CreatePackageFormProps {
  cb?: (packageData: any, isUpdate: boolean) => void;
  initialData?: any;
  isEdit?: boolean;
}

const CreatePackageForm: React.FC<CreatePackageFormProps> = ({
  cb,
  initialData,
  isEdit = false,
}) => {
  const packageTags = usePackageControllerGetPackageTags();
  const company = useCompanyControllerGetCompany();
  const { data: sessionData } = useSession();
  let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

  const [images, setImages] = React.useState<any[]>([]);
  const [categoryData, setCategoryData] = React.useState<any[]>([]);
  const [selectedLanguages, setSelectedLanguages] = React.useState<string[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState<string | null>(null);
  const [selectedVideos, setSelectedVideos] = React.useState<number[]>([]);
  const { videos, setVideos, setSearchVideos, searchVideos } = useTemplateStore();
  const params = useSearchParams();

  const getMultilingualValue = (field: any, fallbackLang = 'en') => {
    if (!field || typeof field !== 'object') return field || '';
    const firstLangValue = field[fallbackLang] || field[Object.keys(field)[0]] || '';
    if (Array.isArray(firstLangValue)) {
      return firstLangValue.map(item => {
        if (typeof item === 'object' && item !== null) {
          return item[fallbackLang] || item[Object.keys(item)[0]] || '';
        }
        return item;
      }).filter(Boolean);
    }
    return firstLangValue;
  };

  const handleImportTranslation = async (targetCardId: string) => {
    const sourceCard = watchedLanguageCards[0];
    const targetCard = watchedLanguageCards.find(card => card.id === targetCardId);

    if (!sourceCard || !targetCard || !sourceCard.langCode || !targetCard.langCode) {
      message.error('Please ensure both source and target languages are selected');
      return;
    }

    if (!sourceCard.data.packageName || !sourceCard.data.buttonText) {
      message.error('Please fill in at least the package name and button text in the first language before importing');
      return;
    }

    setIsTranslating(targetCardId);

    try {
      // Collect all texts to translate
      const textsToTranslate = [
        sourceCard.data.packageName,
        sourceCard.data.packageDescription || '',
        sourceCard.data.taxInformation || '',
        sourceCard.data.packageAlert || '',
        sourceCard.data.buttonText,
        sourceCard.data.soldOutText || '',
        sourceCard.data.purchaseText || '',
        sourceCard.data.popularityText || '',
        sourceCard.data.priceAlgorithms || '',
        ...sourceCard.benefits,
        ...sourceCard.tags,
      ];


      const response = await fetch(`${Url}/api/v1/uploads/translate-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData?.user.backendTokens.at}`,
        },
        body: JSON.stringify({
          texts: textsToTranslate,
          targetLanguage: targetCard.langCode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Translation failed');
      }

      // Extract translations from the API response
      const allTranslations = result.translations.map(t => t.translatedText);
      const benefitsStartIndex = 9;
      const tagsStartIndex = benefitsStartIndex + sourceCard.benefits.length;

      const [
        translatedName,
        translatedDescription,
        translatedTaxInfo,
        translatedAlert,
        translatedButtonText,
        translatedSoldOutText,
        translatedPurchaseText,
        translatedPopularityText,
        translatedPriceAlgorithms,
      ] = allTranslations.slice(0, 9);

      const translatedBenefits = allTranslations.slice(benefitsStartIndex, tagsStartIndex);
      const translatedTags = allTranslations.slice(tagsStartIndex);

      // Update the target card with translated content
      const updatedCards = watchedLanguageCards.map(card => {
        if (card.id === targetCardId) {
          return {
            ...card,
            data: {
              ...card.data,
              packageName: translatedName,
              packageDescription: translatedDescription,
              taxInformation: translatedTaxInfo,
              packageAlert: translatedAlert,
              buttonText: translatedButtonText,
              soldOutText: translatedSoldOutText,
              purchaseText: translatedPurchaseText,
              popularityText: translatedPopularityText,
              priceAlgorithms: translatedPriceAlgorithms,
              currency: sourceCard.data.currency,
              packageBenefits: translatedBenefits,
              packageTags: translatedTags,
            },
            benefits: translatedBenefits,
            tags: translatedTags,
          };
        }
        return card;
      });

      setValue("languageCards", updatedCards, { shouldValidate: true });
      message.success('Translation imported successfully!');

    } catch (error) {
      console.error('Translation error:', error);
      message.error('Failed to translate content. Please try again or fill manually.');
    } finally {
      setIsTranslating(null);
    }
  };

  const convertFromCents = (value: number) => {
    return value ? parseFloat((value / 100).toFixed(2)) : 0;
  };

  const cleanNumber = (value: number | undefined): string | undefined => {
    if (value === undefined || value === null) return undefined;
    const cleaned = parseFloat(value.toString());
    return isNaN(cleaned) ? undefined : cleaned.toString();
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const createDefaultLanguageCard = (langCode = '', data: Partial<MultilingualFields> = {}): LanguageCard => {
    const benefits = Array.isArray(data.packageBenefits) ? [...data.packageBenefits] : [];
    const tags = Array.isArray(data.packageTags) ? [...data.packageTags] : [];

    return {
      id: generateId(),
      langCode,
      data: {
        packageName: data.packageName || "",
        packageDescription: data.packageDescription || "",
        packageBenefits: benefits,
        packageTags: tags,
        taxInformation: data.taxInformation || "",
        currency: data.currency || "",
        packageAlert: data.packageAlert || "",
        buttonText: data.buttonText || "",
        soldOutText: data.soldOutText || "",
        popularityText: data.popularityText || "",
        priceAlgorithms: data.priceAlgorithms || "",
        purchaseText: data.purchaseText || "",
      },
      benefits: benefits,
      tags: tags,
      newBenefit: "",
      newTag: "",
    };
  };

  const getDefaultValues = React.useCallback((): CreatePackageFormFieldValues => {
    // Get default language from URL params
    const defaultLangCode = params.get("lang") || company.data?.defaultLangCode || "en";

    if (isEdit && initialData) {
      // For edit mode, create language cards from existing data
      const existingLanguages = Object.keys(initialData.packageNames || {});
      const languageCards = existingLanguages.map(langCode => {
        return createDefaultLanguageCard(langCode, {
          packageName: getMultilingualValue(initialData.packageNames, langCode),
          packageDescription: getMultilingualValue(initialData.packageDescriptions, langCode),
          packageBenefits: getMultilingualValue(initialData.packageBenefits, langCode),
          packageTags: getMultilingualValue(initialData.packageTags, langCode),
          taxInformation: getMultilingualValue(initialData.taxInformation, langCode),
          currency: getMultilingualValue(initialData.currencies, langCode),
          packageAlert: getMultilingualValue(initialData.packageAlerts, langCode),
          buttonText: getMultilingualValue(initialData.buttonTexts, langCode),
          soldOutText: getMultilingualValue(initialData.soldOutTexts, langCode),
          purchaseText: getMultilingualValue(initialData.purchaseText, langCode),
          popularityText: getMultilingualValue(initialData.popularityTexts, langCode),
          priceAlgorithms: getMultilingualValue(initialData.priceAlgorithms, langCode),
        });
      });

      return {
        packageCode: initialData.packageCode || "",
        originalPrice: initialData.originalPrice || 0,
        discountedPrice: initialData.discountedPrice || undefined,
        includesTax: initialData.includesTax || false,
        taxPercentage: initialData.taxPercentage || undefined,
        active: initialData.active || false,
        roomUpgrade: initialData.roomUpgrade || false,
        from_category_id: initialData.from_category_id || undefined,
        to_category_id: initialData.to_category_id || undefined,
        incentivePercentage: initialData.incentivePercentage || undefined,
        companyId: initialData.companyId || company.data?.id,
        templateId: initialData.templateId || undefined,
        totalPackagesSold: initialData.totalPackagesSold || 0,
        calculationMethod: initialData.calculationMethod || CALCULATION_METHODS[0].value,
        languageCards: languageCards.length > 0 ? languageCards : [createDefaultLanguageCard(defaultLangCode)],
      };
    } else {
      // For create mode, set first card with default language
      return {
        packageCode: "",
        originalPrice: 0,
        discountedPrice: undefined,
        includesTax: false,
        taxPercentage: undefined,
        active: false,
        roomUpgrade: false,
        from_category_id: undefined,
        to_category_id: undefined,
        incentivePercentage: undefined,
        companyId: company.data?.id,
        templateId: undefined,
        totalPackagesSold: 0,
        calculationMethod: CALCULATION_METHODS[0].value,
        languageCards: [createDefaultLanguageCard(defaultLangCode)], // Set default language here
      };
    }
  }, [isEdit, initialData, company.data?.id, params]);

  const {
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreatePackageFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: getDefaultValues(),
  });

  const createPackage = usePackageControllerCreatePackage();
  const updatePackage = usePackageControllerUpdatePackage();

  const watchedLanguageCards = watch("languageCards");
  const watchedRoomUpgrade = watch("roomUpgrade");
  const watchedFromCategory = watch("from_category_id");
  const watchedToCategory = watch("to_category_id");

  const transformCategoryToOptions = (categories) => {
    return categories.map(category => ({
      value: category.id,
      label: category.name,
      taxPercentage: category.taxPercentage,
      soldOut: category.soldOut
    }));
  };

  const getAvailableFromOptions = () => {
    const options = transformCategoryToOptions(categoryData);
    return options.filter(option => option.value !== watchedToCategory);
  };

  const getAvailableToOptions = () => {
    const options = transformCategoryToOptions(categoryData);
    return options.filter(option => option.value !== watchedFromCategory);
  };

  const getAvailableLanguages = (currentLangCode?: string) => {
    return languages.filter(lang =>
      !selectedLanguages.includes(lang.code) || lang.code === currentLangCode
    );
  };

  const addLanguageCard = () => {
    const newCard = createDefaultLanguageCard();
    const updatedCards = [...watchedLanguageCards, newCard];
    setValue("languageCards", updatedCards);
  };

  const removeLanguageCard = (cardId: string) => {
    const cardToRemove = watchedLanguageCards.find(card => card.id === cardId);
    if (cardToRemove?.langCode) {
      setSelectedLanguages(prev => prev.filter(lang => lang !== cardToRemove.langCode));
    }
    const updatedCards = watchedLanguageCards.filter(card => card.id !== cardId);
    setValue("languageCards", updatedCards);
  };

  const updateLanguageCard = (cardId: string, field: string, value: any) => {
    const updatedCards = watchedLanguageCards.map(card => {
      if (card.id === cardId) {
        if (field === 'langCode') {
          // Update selected languages
          const oldLang = card.langCode;
          if (oldLang) {
            setSelectedLanguages(prev => prev.filter(lang => lang !== oldLang));
          }
          if (value) {
            setSelectedLanguages(prev => [...prev, value]);
          }
        }
        return { ...card, [field]: value };
      }
      return card;
    });
    setValue("languageCards", updatedCards, { shouldValidate: true });
  };

  const updateLanguageCardData = (cardId: string, field: string, value: any) => {
    const updatedCards = watchedLanguageCards.map(card => {
      if (card.id === cardId) {
        return {
          ...card,
          data: { ...card.data, [field]: value }
        };
      }
      return card;
    });
    setValue("languageCards", updatedCards);
  };

  const addBenefit = (cardId: string) => {
    const currentCards = watch("languageCards");
    const card = currentCards.find(c => c.id === cardId);

    if (card && card.newBenefit && card.newBenefit.trim()) {
      const newBenefit = card.newBenefit.trim();

      // Check for duplicates
      if (!card.benefits.includes(newBenefit)) {
        const updatedCards = currentCards.map(c => {
          if (c.id === cardId) {
            const updatedBenefits = [...c.benefits, newBenefit];
            return {
              ...c,
              benefits: updatedBenefits,
              newBenefit: '',
              data: {
                ...c.data,
                packageBenefits: updatedBenefits
              }
            };
          }
          return c;
        });

        setValue("languageCards", updatedCards, { shouldValidate: true });
      } else {
        message.warning('This benefit already exists');
      }
    }
  };

  const removeBenefit = (cardId: string, index: number) => {
    const currentCards = watch("languageCards");
    const updatedCards = currentCards.map(card => {
      if (card.id === cardId) {
        const updatedBenefits = card.benefits.filter((_, i) => i !== index);
        return {
          ...card,
          benefits: updatedBenefits,
          data: {
            ...card.data,
            packageBenefits: updatedBenefits
          }
        };
      }
      return card;
    });
    setValue("languageCards", updatedCards, { shouldValidate: true });
  };

  const addTag = (cardId: string) => {
    const currentCards = watch("languageCards");
    const card = currentCards.find(c => c.id === cardId);

    if (card && card.newTag && card.newTag.trim()) {
      const newTag = card.newTag.trim();

      // Check for duplicates
      if (!card.tags.includes(newTag)) {
        const updatedCards = currentCards.map(c => {
          if (c.id === cardId) {
            const updatedTags = [...c.tags, newTag];
            return {
              ...c,
              tags: updatedTags,
              newTag: '',
              data: {
                ...c.data,
                packageTags: updatedTags
              }
            };
          }
          return c;
        });

        setValue("languageCards", updatedCards, { shouldValidate: true });
      } else {
        message.warning('This tag already exists');
      }
    }
  };

  const removeTag = (cardId: string, index: number) => {
    const currentCards = watch("languageCards");
    const updatedCards = currentCards.map(card => {
      if (card.id === cardId) {
        const updatedTags = card.tags.filter((_, i) => i !== index);
        return {
          ...card,
          tags: updatedTags,
          data: {
            ...card.data,
            packageTags: updatedTags
          }
        };
      }
      return card;
    });
    setValue("languageCards", updatedCards, { shouldValidate: true });
  };

  // Initialize form data only once for edit mode
  React.useEffect(() => {
    if (isEdit && initialData && !isInitialized) {
      if (initialData.videos?.length > 0) {
        setSelectedVideos(initialData.videos.map(v => v.id));
      }
      // Set selected languages from initial data
      const existingLanguages = Object.keys(initialData.packageNames || {});
      setSelectedLanguages(existingLanguages);

      // Set images from initial data
      if (initialData.signedImageUrls && Array.isArray(initialData.signedImageUrls)) {
        setImages(initialData.signedImageUrls);
      }

      // Reset form with default values
      reset(getDefaultValues());

      // Mark as initialized to prevent re-runs
      setIsInitialized(true);
    } else if (!isEdit && !isInitialized) {
      // For create mode, set default language
      const defaultLangCode = params.get("lang") || company.data?.defaultLangCode || "en";
      setSelectedLanguages([defaultLangCode]);
      setIsInitialized(true);
    }
  }, [isEdit, initialData, isInitialized, params, company.data?.defaultLangCode, reset, getDefaultValues]);

  // Fetch categories
  React.useEffect(() => {
    fetch(`${Url}/api/v1/uploads/get-all-categories?fetchAll=true&limit=100`, {
      headers: { Authorization: `Bearer ${sessionData?.user.backendTokens.at}` },
    })
      .then(async (response) => {
        const text = await response.text();
        const json = JSON.parse(text);
        const data = json.data || json;
        setCategoryData(data);
      })
      .catch((error) => {
        console.warn("Error fetching data:", error);
      });
  }, [sessionData]);

  // Reset form when edit mode changes
  React.useEffect(() => {
    if (isEdit && initialData) {
      reset(getDefaultValues());
      if (initialData.signedImageUrls && Array.isArray(initialData.signedImageUrls)) {
        setImages(initialData.signedImageUrls);
      }
    }
  }, [isEdit, initialData, reset]);

  // Complete updated handleCreatePackage function with precision fixes
  const handleCreatePackage = (data: CreatePackageFormFieldValues) => {
    const formData = new FormData();

    // Helper function to clean numbers and avoid floating point precision issues
    const cleanNumber = (value: number | undefined): string | undefined => {
      if (value === undefined || value === null || isNaN(value)) return undefined;
      // Use parseFloat and toFixed to ensure clean decimal representation
      const cleaned = parseFloat(value.toString()); cleanNumber
      return isNaN(cleaned) ? undefined : cleaned.toString();
    };

    // Add non-multilingual fields with proper number cleaning
    formData.append('packageCode', data.packageCode);

    const cleanOriginalPrice = cleanNumber(data.originalPrice);
    if (cleanOriginalPrice) formData.append('originalPrice', cleanOriginalPrice);

    if (data.discountedPrice) {
      const cleanDiscountedPrice = cleanNumber(data.discountedPrice);
      if (cleanDiscountedPrice) formData.append('discountedPrice', cleanDiscountedPrice);
    }

    formData.append('includesTax', data.includesTax.toString());

    if (data.taxPercentage) {
      const cleanTaxPercentage = cleanNumber(data.taxPercentage);
      if (cleanTaxPercentage) formData.append('taxPercentage', cleanTaxPercentage);
    }

    formData.append('active', data.active.toString());
    formData.append('roomUpgrade', data.roomUpgrade.toString());
    formData.append('calculationMethod', data.calculationMethod);

    if (data.from_category_id) {
      formData.append('from_category_id', data.from_category_id.toString());
    }
    if (data.to_category_id) {
      formData.append('to_category_id', data.to_category_id.toString());
    }
    if (data.incentivePercentage) {
      const cleanIncentivePercentage = cleanNumber(data.incentivePercentage);
      if (cleanIncentivePercentage) formData.append('incentivePercentage', cleanIncentivePercentage);
    }

    formData.append('companyId', (data.companyId || company.data?.id).toString());
    formData.append('totalPackagesSold', (data.totalPackagesSold || 0).toString());

    if (selectedVideos && selectedVideos.length > 0) {
      selectedVideos.forEach((videoId, index) => {
        formData.append("videoIds[]", videoId.toString());

        // Optional metadata if required
        formData.append(`videoMetadata[${index}]`, JSON.stringify({
          tag: videos.find(v => v.id === videoId)?.tag || `Video ${videoId}`,
          order: index + 1
        }));
      });
    }


    if (data.templateId) {
      formData.append('templateId', data.templateId.toString());
    }

    // Build multilingual data objects - UPDATED WITH NEW FIELDS
    const packageNames: Record<string, string> = {};
    const packageDescriptions: Record<string, string> = {};
    const packageBenefits: Record<string, string[]> = {};
    const packageTags: Record<string, string[]> = {};
    const taxInformation: Record<string, string> = {};
    const currencies: Record<string, string> = {};
    const packageAlerts: Record<string, string> = {};
    const buttonTexts: Record<string, string> = {};
    const soldOutTexts: Record<string, string> = {};
    const purchaseText: Record<string, string> = {};
    const popularityTexts: Record<string, string> = {};
    const priceAlgorithms: Record<string, string> = {};

    data.languageCards.forEach(card => {
      if (card.langCode) {
        packageNames[card.langCode] = card.data.packageName;
        packageDescriptions[card.langCode] = card.data.packageDescription || "";
        packageBenefits[card.langCode] = card.benefits;
        packageTags[card.langCode] = card.tags;
        taxInformation[card.langCode] = card.data.taxInformation || "";
        currencies[card.langCode] = card.data.currency;
        packageAlerts[card.langCode] = card.data.packageAlert || "";
        buttonTexts[card.langCode] = card.data.buttonText;
        soldOutTexts[card.langCode] = card.data.soldOutText || "";
        purchaseText[card.langCode] = card.data.purchaseText || "";
        popularityTexts[card.langCode] = card.data.popularityText || "";
        priceAlgorithms[card.langCode] = card.data.priceAlgorithms || "";
      }
    });

    // Add multilingual data to FormData - UPDATED WITH NEW FIELDS
    formData.append('packageNames', JSON.stringify(packageNames));
    formData.append('packageDescriptions', JSON.stringify(packageDescriptions));
    formData.append('packageBenefits', JSON.stringify(packageBenefits));
    formData.append('packageTags', JSON.stringify(packageTags));
    formData.append('taxInformation', JSON.stringify(taxInformation));
    formData.append('currencies', JSON.stringify(currencies));
    formData.append('packageAlerts', JSON.stringify(packageAlerts));
    formData.append('buttonTexts', JSON.stringify(buttonTexts));
    formData.append('soldOutTexts', JSON.stringify(soldOutTexts));
    formData.append('purchaseText', JSON.stringify(purchaseText));
    formData.append('popularityTexts', JSON.stringify(popularityTexts));
    formData.append('priceAlgorithms', JSON.stringify(priceAlgorithms));

    // Add images
    if (images && images.length > 0) {
      images.forEach((image, index) => {
        if (image.originFileObj) {
          formData.append(`images`, image.originFileObj);
          formData.append(`imageMetadata[${index}]`, JSON.stringify({
            alt: image.alt || image.name,
            order: index + 1
          }));
        }
      });
    }
    // Submit the form data
    if (isEdit && initialData?.id) {
      updatePackage.mutate(
        { id: initialData.id, data: formData },
        {
          onSuccess: (packageResponse) => {
            message.success('Package updated successfully!');
            if (cb) {
              cb(packageResponse, true);
            }
          },
          onError: (error) => {
            message.error('Failed to update package');
            console.error('Update error:', error);
          }
        }
      );
    } else {
      createPackage.mutate(
        { data: formData },
        {
          onSuccess: (packageResponse) => {
            message.success('Package created successfully!');
            if (cb) {
              cb(packageResponse, false);
            }
          },
          onError: (error) => {
            message.error('Failed to create package');
            console.error('Create error:', error);
          }
        }
      );
    }
  };

  const onSubmit: SubmitHandler<CreatePackageFormFieldValues> = (data) => {
    handleCreatePackage(data);
  };

  const handleImageUpload = (info: any) => {
    if (info.fileList) {
      const processedImages = info.fileList.map((file: any, index: number) => ({
        uid: file.uid,
        name: file.name,
        url: file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : ''),
        alt: file.name,
        order: index + 1,
        originFileObj: file.originFileObj,
        status: file.status
      }));
      setImages(processedImages);
    }

    if (info.file) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    }
  };

  const isLoading = createPackage.status === "pending" || updatePackage.status === "pending";
  const error = createPackage.error || updatePackage.error;
  const loadingIndicator = <LoadingOutlined style={{ fontSize: 24 }} spin />;

  return (
    <div className="create-package-form-wrapper" style={{ position: 'relative' }}>
      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          borderRadius: '8px'
        }}>
          <Spin indicator={loadingIndicator} size="large" />
          <Text style={{ marginTop: '16px', fontSize: '16px', color: '#1890ff', fontWeight: 500 }}>
            {isEdit ? 'Updating package...' : 'Creating package...'}
          </Text>
          <Text type="secondary" style={{ marginTop: '8px', fontSize: '14px' }}>
            Please wait while we process your request
          </Text>
        </div>
      )}

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        className="create-package-form"
        style={{ opacity: isLoading ? 0.6 : 1 }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', paddingTop: '1rem' }}>

          {/* Non-Multilingual Fields */}
          <Card
            title={<Title level={4} style={{ margin: 0 }}>Package Configuration</Title>}
            size="small"
            style={{ backgroundColor: '#fafafa' }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Package Code"
                  validateStatus={errors.packageCode ? 'error' : ''}
                  help={errors.packageCode?.message}
                  required
                >
                  <Controller
                    name="packageCode"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Enter unique package code"
                        status={errors.packageCode ? 'error' : ''}
                        disabled={isEdit || isLoading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Original Price"
                  validateStatus={errors.originalPrice ? 'error' : ''}
                  help={errors.originalPrice?.message}
                  required
                >
                  <Controller
                    name="originalPrice"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        placeholder="0"
                        style={{ width: '100%' }}
                        status={errors.originalPrice ? 'error' : ''}
                        min={0}
                        step={0.01}
                        disabled={isLoading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="Selling Price"
                  validateStatus={errors.discountedPrice ? 'error' : ''}
                  help={errors.discountedPrice?.message}
                >
                  <Controller
                    name="discountedPrice"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        placeholder="0"
                        style={{ width: '100%' }}
                        status={errors.discountedPrice ? 'error' : ''}
                        min={0}
                        step={0.01}
                        disabled={isLoading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="Tax Percentage"
                  validateStatus={errors.taxPercentage ? 'error' : ''}
                  help={errors.taxPercentage?.message}
                >
                  <Controller
                    name="taxPercentage"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        placeholder="0"
                        style={{ width: '100%' }}
                        status={errors.taxPercentage ? 'error' : ''}
                        min={0}
                        max={100}
                        precision={2}
                        formatter={(value) => `${value}%`}
                        parser={(value) => value!.replace('%', '')}
                        disabled={isLoading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item
                  label="Incentive Percentage"
                  validateStatus={errors.incentivePercentage ? 'error' : ''}
                  help={errors.incentivePercentage?.message}
                >
                  <Controller
                    name="incentivePercentage"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        placeholder="0"
                        style={{ width: '100%' }}
                        status={errors.incentivePercentage ? 'error' : ''}
                        min={0}
                        max={100}
                        precision={2}
                        formatter={(value) => `${value}%`}
                        parser={(value) => value!.replace('%', '')}
                        disabled={isLoading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Includes Tax">
                  <Controller
                    name="includesTax"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        {...field}
                        checked={field.value}
                        checkedChildren="Yes"
                        unCheckedChildren="No"
                        disabled={isLoading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item label="Active">
                  <Controller
                    name="active"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        {...field}
                        checked={field.value}
                        checkedChildren="Active"
                        unCheckedChildren="Inactive"
                        disabled={isLoading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item label="Category Upgrade">
                  <Controller
                    name="roomUpgrade"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        {...field}
                        checked={field.value}
                        checkedChildren="Yes"
                        unCheckedChildren="No"
                        disabled={isLoading}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
            </Row>

            {watchedRoomUpgrade && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="From Category"
                    validateStatus={errors.from_category_id ? 'error' : ''}
                    help={errors.from_category_id?.message}
                  >
                    <Controller
                      name="from_category_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Select from category"
                          status={errors.from_category_id ? 'error' : ''}
                          allowClear
                          options={getAvailableFromOptions()}
                          disabled={isLoading}
                        />
                      )}
                    />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="To Category"
                    validateStatus={errors.to_category_id ? 'error' : ''}
                    help={errors.to_category_id?.message}
                  >
                    <Controller
                      name="to_category_id"
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          placeholder="Select to category"
                          status={errors.to_category_id ? 'error' : ''}
                          allowClear
                          options={getAvailableToOptions()}
                          disabled={isLoading}
                        />
                      )}
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Calculation Method"
                  validateStatus={errors.calculationMethod ? 'error' : ''}
                  help={errors.calculationMethod?.message}
                  required
                >
                  <Controller
                    name="calculationMethod"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        placeholder="Select calculation method"
                        status={errors.calculationMethod ? 'error' : ''}
                        options={CALCULATION_METHODS}
                        disabled={isLoading}
                        style={{ width: '100%' }}
                      />
                    )}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Total Packages Sold"
                  validateStatus={errors.totalPackagesSold ? 'error' : ''}
                  help={errors.totalPackagesSold?.message}
                >
                  <Controller
                    name="totalPackagesSold"
                    control={control}
                    render={({ field }) => (
                      <InputNumber
                        {...field}
                        placeholder="Enter total packages sold"
                        style={{ width: '100%' }}
                        status={errors.totalPackagesSold ? 'error' : ''}
                        disabled={isLoading}
                        min={0}
                      />
                    )}
                  />
                </Form.Item></Col>
            </Row>

            {/* Images */}

            <Form.Item label="Package Images">
              <Upload
                multiple
                listType="picture"
                onChange={handleImageUpload}
                disabled={isLoading}
                beforeUpload={(file) => {
                  return false;
                }}
                fileList={images.map((img, index) => ({
                  uid: img.uid || index.toString(),
                  name: img.name || img.alt || `image-${index}`,
                  status: 'done',
                  url: img.signedUrl ? img.signedUrl : img.url,
                  originFileObj: img.originFileObj
                }))}
                onRemove={(file) => {
                  const newImages = images.filter(img => img.uid !== file.uid);
                  setImages(newImages);
                }}
              >
                <Button icon={<UploadOutlined />} disabled={isLoading}>
                  Upload Images
                </Button>
              </Upload>
            </Form.Item>

            <Form.Item label="Package Videos">
              <Select
                mode="multiple"
                showSearch
                placeholder="Select videos"
                value={selectedVideos}
                onChange={(values) => setSelectedVideos(values)}
                style={{ width: "100%" }}
                optionLabelProp="label"
              >
                {videos.map((video) => (
                  <Select.Option
                    key={video.id}
                    value={video.id}
                    label={video.tag || `Video ${video.id}`}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <video
                        src={video.url}
                        width="80"
                        height="50"
                        style={{ objectFit: "cover", borderRadius: 4 }}
                      />
                      <span>{video.tag || `Video ${video.id}`}</span>
                    </div>
                  </Select.Option>
                ))}
              </Select>

              {selectedVideos.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {selectedVideos.map((videoId) => {
                    const vid = videos.find((v) => v.id === videoId || v.id === videoId?.id);
                    return (
                      <video
                        key={videoId}
                        src={vid?.url}
                        width="160"
                        height="90"
                        controls
                        style={{ borderRadius: 8, border: "1px solid #ddd" }}
                      />
                    );
                  })}
                </div>
              )}
            </Form.Item>
          </Card>

          {/* Multilingual Fields - Language Cards */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Multi-Language Content</Title>
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={addLanguageCard}
                  disabled={isLoading || selectedLanguages.length >= languages.length}
                >
                  Add Language
                </Button>
              </div>
            }
            size="small"
          >
            {errors.languageCards && (
              <Alert
                message={errors.languageCards.message}
                type="error"
                style={{ marginBottom: 16 }}
              />
            )}

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {watchedLanguageCards.map((card, index) => (
                <Card
                  key={card.id}
                  type="inner"
                  size="small"
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Text strong>Language {index + 1}</Text>
                        <Select
                          value={card.langCode}
                          placeholder="Select Language"
                          style={{ minWidth: 150 }}
                          onChange={(value) => updateLanguageCard(card.id, 'langCode', value)}
                          options={getAvailableLanguages(card.langCode).map(lang => ({
                            value: lang.code,
                            label: lang.name
                          }))}
                          disabled={isLoading}
                          showSearch
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                        />

                        {/* Import Translation Button - Only show for non-first cards */}
                        {index > 0 && watchedLanguageCards[0]?.langCode && card.langCode && (
                          <Button
                            type="default"
                            size="small"
                            icon={isTranslating === card.id ? <LoadingOutlined /> : <TranslationOutlined />}
                            onClick={() => handleImportTranslation(card.id)}
                            disabled={isLoading || isTranslating === card.id || !watchedLanguageCards[0]?.data?.packageName}
                            style={{
                              borderColor: '#52c41a',
                              color: '#52c41a',
                            }}
                          >
                            {isTranslating === card.id ? 'Translating...' : 'Import Translation'}
                          </Button>
                        )}
                      </div>
                      {watchedLanguageCards.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeLanguageCard(card.id)}
                          disabled={isLoading}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  }
                  style={{
                    backgroundColor: card.langCode ? '#f9f9f9' : '#fff2e8',
                    border: card.langCode ? '1px solid #d9d9d9' : '1px solid #ffcc99'
                  }}
                >
                  {!card.langCode && (
                    <Alert
                      message="Please select a language for this content"
                      type="warning"
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Package Name"
                        validateStatus={errors.languageCards?.[index]?.data?.packageName ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.packageName?.message}
                      >
                        <Input
                          value={card.data.packageName}
                          onChange={(e) => updateLanguageCardData(card.id, 'packageName', e.target.value)}
                          placeholder="Enter package name"
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>

                    <Col span={12}>
                      <Form.Item
                        label="Button Text"
                        validateStatus={errors.languageCards?.[index]?.data?.buttonText ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.buttonText?.message}
                      >
                        <Input
                          value={card.data.buttonText}
                          onChange={(e) => updateLanguageCardData(card.id, 'buttonText', e.target.value)}
                          placeholder="e.g., Buy Now, Purchase"
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Currency"
                        validateStatus={errors.languageCards?.[index]?.data?.currency ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.currency?.message}
                      >
                        <Input
                          value={card.data.currency}
                          onChange={(e) => updateLanguageCardData(card.id, 'currency', e.target.value)}
                          placeholder="Enter currency code"
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>

                    <Col span={12}>
                      <Form.Item
                        label="Package Alert"
                        validateStatus={errors.languageCards?.[index]?.data?.packageAlert ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.packageAlert?.message}
                      >
                        <Input
                          value={card.data.packageAlert}
                          onChange={(e) => updateLanguageCardData(card.id, 'packageAlert', e.target.value)}
                          placeholder="Enter alert message"
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Sold Out Text"
                        validateStatus={errors.languageCards?.[index]?.data?.soldOutText ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.soldOutText?.message}
                      >
                        <Input
                          value={card.data.soldOutText}
                          onChange={(e) => updateLanguageCardData(card.id, 'soldOutText', e.target.value)}
                          placeholder="e.g., Sold Out, Out of Stock"
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Purchase Text"
                        validateStatus={errors.languageCards?.[index]?.data?.purchaseText ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.purchaseText?.message}
                      >
                        <Input
                          value={card.data.purchaseText}
                          onChange={(e) => updateLanguageCardData(card.id, 'purchaseText', e.target.value)}
                          placeholder="e.g., Purchase, Sold"
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="Popularity Text"
                        validateStatus={errors.languageCards?.[index]?.data?.popularityText ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.popularityText?.message}
                      >
                        <Input
                          value={card.data.popularityText}
                          onChange={(e) => updateLanguageCardData(card.id, 'popularityText', e.target.value)}
                          placeholder="e.g., Popular, Best Seller"
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    label="Package Description"
                    validateStatus={errors.languageCards?.[index]?.data?.packageDescription ? 'error' : ''}
                    help={errors.languageCards?.[index]?.data?.packageDescription?.message}
                  >
                    <TextArea
                      value={card.data.packageDescription}
                      onChange={(e) => updateLanguageCardData(card.id, 'packageDescription', e.target.value)}
                      placeholder="Enter package description"
                      rows={3}
                      disabled={isLoading}
                    />
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="Price Algorithm"
                        validateStatus={errors.languageCards?.[index]?.data?.priceAlgorithms ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.priceAlgorithms?.message}
                      >
                        <Input
                          value={card.data.priceAlgorithms}
                          onChange={(e) =>
                            updateLanguageCardData(card.id, 'priceAlgorithms', e.target.value)
                          }
                          placeholder="e.g. Price per Day, Price per Person"
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>

                    <Col span={12}>
                      <Form.Item
                        label="Tax Information"
                        validateStatus={errors.languageCards?.[index]?.data?.taxInformation ? 'error' : ''}
                        help={errors.languageCards?.[index]?.data?.taxInformation?.message}
                      >
                        <TextArea
                          value={card.data.taxInformation}
                          onChange={(e) => updateLanguageCardData(card.id, 'taxInformation', e.target.value)}
                          placeholder="Enter tax information"
                          rows={1}
                          disabled={isLoading}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Package Benefits">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space.Compact style={{ display: 'flex', width: '100%' }}>
                            <Input
                              value={card.newBenefit || ''}
                              onChange={(e) => {
                                const updatedCards = watchedLanguageCards.map(c =>
                                  c.id === card.id ? { ...c, newBenefit: e.target.value } : c
                                );
                                setValue("languageCards", updatedCards);
                              }}
                              placeholder="Add benefit"
                              onPressEnter={() => addBenefit(card.id)}
                              style={{ flex: 1 }}
                              disabled={isLoading}
                            />
                            <Button
                              onClick={() => addBenefit(card.id)}
                              disabled={isLoading || !card.newBenefit?.trim()}
                              type="primary"
                            >
                              Add
                            </Button>
                          </Space.Compact>

                          {/* Display added benefits */}
                          {card.benefits && card.benefits.length > 0 && (
                            <div style={{
                              maxHeight: '120px',
                              overflowY: 'auto',
                              border: '1px solid #d9d9d9',
                              borderRadius: '6px',
                              padding: '8px'
                            }}>
                              {card.benefits.map((benefit, benefitIndex) => (
                                <div key={benefitIndex} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '6px 8px',
                                  margin: '2px 0',
                                  backgroundColor: '#f0f8ff',
                                  borderRadius: '4px',
                                  border: '1px solid #e1f3ff'
                                }}>
                                  <Text style={{ flex: 1, fontSize: '13px' }}>{benefit}</Text>
                                  <Button
                                    size="small"
                                    danger
                                    type="text"
                                    onClick={() => removeBenefit(card.id, benefitIndex)}
                                    disabled={isLoading}
                                    style={{ minWidth: 'auto', padding: '0 4px' }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </Space>
                      </Form.Item>
                    </Col>

                    <Col span={12}>
                      <Form.Item label="Package Tags">
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Space.Compact style={{ display: 'flex', width: '100%' }}>
                            <Input
                              value={card.newTag || ''}
                              onChange={(e) => {
                                const updatedCards = watchedLanguageCards.map(c =>
                                  c.id === card.id ? { ...c, newTag: e.target.value } : c
                                );
                                setValue("languageCards", updatedCards);
                              }}
                              placeholder="Add tag"
                              onPressEnter={() => addTag(card.id)}
                              style={{ flex: 1 }}
                              disabled={isLoading}
                            />
                            <Button
                              onClick={() => addTag(card.id)}
                              disabled={isLoading || !card.newTag?.trim()}
                              type="primary"
                            >
                              Add
                            </Button>
                          </Space.Compact>

                          {/* Display added tags */}
                          {card.tags && card.tags.length > 0 && (
                            <div style={{
                              maxHeight: '120px',
                              overflowY: 'auto',
                              border: '1px solid #d9d9d9',
                              borderRadius: '6px',
                              padding: '8px'
                            }}>
                              {card.tags.map((tag, tagIndex) => (
                                <div key={tagIndex} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '6px 8px',
                                  margin: '2px 0',
                                  backgroundColor: '#fff7e6',
                                  borderRadius: '4px',
                                  border: '1px solid #ffe7ba'
                                }}>
                                  <Text style={{ flex: 1, fontSize: '13px' }}>{tag}</Text>
                                  <Button
                                    size="small"
                                    danger
                                    type="text"
                                    onClick={() => removeTag(card.id, tagIndex)}
                                    disabled={isLoading}
                                    style={{ minWidth: 'auto', padding: '0 4px' }}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </Space>
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          </Card>

          {/* Error Display */}
          {error?.message && (
            <Alert
              message={error.response?.data.message || error.message}
              type="error"
              showIcon
            />
          )}

          {/* Submit Button */}
          <Form.Item style={{ textAlign: 'center', marginBottom: 0, marginTop: '24px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              disabled={isLoading}
              style={{
                width: "100%",
                height: '48px',
                fontSize: '16px',
                fontWeight: '600'
              }}
              className="create-package-button"
            >
              {isLoading
                ? (isEdit ? 'Updating...' : 'Creating...')
                : (isEdit ? 'Update Package' : 'Create Package')
              }
            </Button>
          </Form.Item>
        </Space>
      </Form>
    </div>
  );
};

export default CreatePackageForm;