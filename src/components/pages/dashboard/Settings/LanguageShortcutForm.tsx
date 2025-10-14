import * as React from "react";
import {
  Form,
  Input,
  Button,
  Space,
  Tag,
  AutoComplete,
  Alert,
  Spin,
  Card,
  Row,
  Col,
  Divider,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { languages } from "../../../../constant/languages";
import { useShortcutControllerCreateShortcutMany } from "../../../../lib/client/api";
import { PostShortcutReq } from "../../../../lib/client/model";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";

export const LanguageShortcutForm: React.FC = () => {
  const { languagesShortcuts, setLanguagesShortcuts } = useShortcutStore();
  const [form] = Form.useForm();
  const [currLanguages, setCurrLanguages] = React.useState<
    { lang: string; order: number }[]
  >([]);
  const [error, setError] = React.useState<string>("");
  const createShortcutMany = useShortcutControllerCreateShortcutMany();

  React.useEffect(() => {
    const mappedInitial =
      languagesShortcuts.map(({ order, value }) => {
        return { lang: value, order: order ?? 0 };
      }) ?? [];

    setCurrLanguages(mappedInitial);
  }, [languagesShortcuts]);

  const languageOptions = languages.map(({ name, code }) => ({
    label: `${name} (${code})`,
    value: code,
  }));

  const handleAddLanguageShortcut = () => {
    const language = form.getFieldValue("language");
    const isValid = validateLanguage(language);

    if (!isValid) return;

    setCurrLanguages((prev) => [
      ...prev,
      { lang: language, order: prev.length },
    ]);
    form.setFieldValue("language", undefined);
  };

  const handleRemoveLanguage = (lang: string) => {
    setCurrLanguages((prev) => prev.filter((fil) => fil.lang !== lang));
    setError("");
  };

  const handleSubmit = () => {
    if (currLanguages.length === 0) {
      setError("Please add at least one language");
      return;
    }

    const postShortCutReqArray: PostShortcutReq[] = currLanguages.map(
      (language, index) => {
        return {
          type: "Language",
          value: language.lang,
          key: language.lang,
          order: index + 1,
        };
      }
    );

    createShortcutMany.mutate(
      { data: { postShortCutReqArray } },
      {
        onSuccess: (data) => {
          setLanguagesShortcuts(data);
          setError("");
          form.setFieldValue("language", undefined);
        },
      }
    );
  };

  const validateLanguage = (language?: string) => {
    let isValid = false;

    if (!language) {
      setError("You must select a language to add");
      return isValid;
    }

    const isLanguagesInclude = languages
      .map(({ code }) => code)
      .includes(language);

    if (!isLanguagesInclude) {
      setError("You must select a valid language to add");
      return isValid;
    }

    const isInclude = currLanguages.some((crr) => crr.lang === language);

    if (isInclude) {
      setError("This language is already added");
      return isValid;
    }

    if (currLanguages.length === 7) {
      setError("You can't add more than 7 language shortcuts");
      return isValid;
    }

    isValid = true;
    setError("");

    return isValid;
  };

  const sortedLanguages = currLanguages.sort((a, b) => a.order - b.order);

  return (
    <Card
      className="w-full"
      title={<span className="text-lg font-bold">Language Shortcuts</span>}
      bordered={false}
      style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)" }}
    >
      <Spin spinning={createShortcutMany.isPending}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Add Language"
            tooltip="Add up to 7 languages for quick access"
            name="language"
          >
            <Space.Compact style={{ width: "100%" }}>
              <AutoComplete
                style={{ width: "calc(100% - 44px)" }}
                placeholder="Search and select a language..."
                options={languageOptions}
                filterOption={(inputValue, option) =>
                  option?.label
                    ?.toString()
                    .toLowerCase()
                    .includes(inputValue.toLowerCase()) ?? false
                }
                onFocus={() => setError("")}
                onBlur={() => setError("")}
                onChange={() => setError("")}
                onSelect={(value) => {
                  form.setFieldValue("language", value);
                }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddLanguageShortcut}
                style={{ width: "44px" }}
              />
            </Space.Compact>
          </Form.Item>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError("")}
              style={{ marginBottom: "16px" }}
            />
          )}

          {sortedLanguages.length > 0 && (
            <Form.Item label={`Selected Languages (${sortedLanguages.length}/7)`}>
              <Space wrap style={{ width: "100%" }}>
                {sortedLanguages.map((res) => (
                  <Tag
                    key={res.lang}
                    closable
                    onClose={() => handleRemoveLanguage(res.lang)}
                    icon={<DeleteOutlined />}
                    color="blue"
                    style={{
                      padding: "4px 12px",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    {res.lang.toUpperCase()}
                  </Tag>
                ))}
              </Space>
            </Form.Item>
          )}

          <Divider />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={createShortcutMany.isPending}
              disabled={currLanguages.length === 0 || createShortcutMany.isPending}
            >
              Save Language Shortcuts
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Card>
  );
};