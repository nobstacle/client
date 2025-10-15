import * as React from "react";
import { Button, Select, Input, Tag, Row, Col, Card, Space, Popover, Alert } from "antd";
import { PlusOutlined, DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import * as Io5Icons from "react-icons/io5";
import {
  useImageTemplateControllerGetImageTags,
  useMapTemplateControllerGetMapTags,
  useShortcutControllerCreateShortcutMany,
  useSlideshowTemplateControllerGetTextTags,
  useTextTemplateControllerGetTextTags,
  useVideoTemplateControllerGetVideoTags,
  useWebsiteTemplateControllerGetWebsiteTags,
  useDocumentControllerGetDocumentTags
} from "../../../../lib/client/api";
import { ChatType, PostShortcutReq } from "../../../../lib/client/model";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";

export const ColorShortcutForm: React.FC = () => {
  const { company } = useCompanyStore();
  const { templatesShortcuts, setTemplatesShortcuts } = useShortcutStore();
  const [currShortcuts, setCurrShortcuts] = React.useState<
    { icon: string; tag: string; type: ChatType; order: number; color?: string }[]
  >([]);
  const [currType, setType] = React.useState<ChatType>();
  const [currTag, setTag] = React.useState<string>("");
  const [selectedIcon, setSelectedIcon] = React.useState<string>("IoAdd");
  const [selectedColor, setSelectedColor] = React.useState<string>("#000000");
  const [showIconPicker, setShowIconPicker] = React.useState<boolean>(false);
  const [iconSearchQuery, setIconSearchQuery] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");

  const createShortcutMany = useShortcutControllerCreateShortcutMany();

  const textTags = useTextTemplateControllerGetTextTags();
  const imageTags = useImageTemplateControllerGetImageTags();
  const slideshowTags = useSlideshowTemplateControllerGetTextTags();
  const videoTags = useVideoTemplateControllerGetVideoTags();
  const mapTags = useMapTemplateControllerGetMapTags();
  const websiteTags = useWebsiteTemplateControllerGetWebsiteTags();
  const documentTags = useDocumentControllerGetDocumentTags();

  const iconKeys = Object.keys(Io5Icons).filter(
    (name) => !name.includes("Outline") && !name.includes("Sharp")
  );

  const iconKeywords: Record<string, string[]> = {
    IoAdd: ["plus", "add", "new", "create"],
    IoHome: ["house", "home", "main"],
    IoHeart: ["love", "like", "favorite"],
    IoStar: ["favorite", "rating", "bookmark"],
    IoTrash: ["delete", "remove", "bin", "garbage"],
    IoSearch: ["find", "magnify", "look"],
    IoSettings: ["config", "preferences", "options", "gear"],
  };

  const filteredIconKeys = React.useMemo(() => {
    if (!iconSearchQuery.trim()) return iconKeys;
    const query = iconSearchQuery.toLowerCase();

    return iconKeys.filter((iconName) => {
      if (iconName.toLowerCase().includes(query)) return true;
      const keywords = iconKeywords[iconName] || [];
      return keywords.some((keyword) => keyword.includes(query));
    });
  }, [iconSearchQuery, iconKeys]);

  React.useEffect(() => {
    const mappedInitial =
      templatesShortcuts.map(({ order, key, value, extraValue, color }) => {
        return {
          icon: extraValue ?? "IoAdd",
          color: color,
          order: order ?? 0,
          tag: value,
          type: key as any,
        };
      }) ?? [];

    setCurrShortcuts(mappedInitial);
  }, [templatesShortcuts]);

  const handleAddLangaugeShortcut = () => {
    const isValid = validateForm();

    if (!isValid) return;
    if (!currType) return;

    setCurrShortcuts((prev) => [
      ...prev,
      {
        icon: selectedIcon,
        tag: currTag,
        type: currType,
        order: prev.length,
        color: selectedColor,
      },
    ]);
  };

  const handleSubmit = () => {
    if (currShortcuts.length === 0) return;

    const postShortCutReqArray: PostShortcutReq[] = currShortcuts.map(
      (shortcut, index) => {
        return {
          type: "Template",
          value: shortcut.tag,
          key: shortcut.type,
          order: index + 1,
          extraValue: shortcut.icon,
          color: shortcut.color,
        };
      }
    );

    createShortcutMany.mutate(
      { data: { postShortCutReqArray } },
      {
        onSuccess: (data) => {
          setTemplatesShortcuts(data);
        },
      }
    );
  };

  const validateForm = () => {
    let isValid = false;

    if (!currType) {
      setError("You must select type of template");
      return isValid;
    }

    if (!currTag) {
      setError("You must select tag of template");
      return isValid;
    }

    if (!selectedIcon) {
      setError("You must select an icon");
      return isValid;
    }

    const isTemplateAssigned = currShortcuts.some(
      (currShortcut) =>
        currShortcut.tag === currTag && currShortcut.type === currType
    );

    if (isTemplateAssigned) {
      setError("The template is already assigned to an icon");
      return isValid;
    }

    if (currShortcuts.length === 7) {
      setError("You can't add more than 7 template shortcuts");
      return isValid;
    }

    isValid = true;
    return isValid;
  };

  const renderIcon = (iconName: string, color?: string) => {
    const IconComponent = (Io5Icons as any)[iconName];
    return IconComponent ? (
      <IconComponent size={20} style={{ color: color || "#000000" }} />
    ) : null;
  };

  const getTagOptions = () => {
    const typeToDataMap: Record<string, any> = {
      Text: textTags.data,
      Image: imageTags.data,
      Video: videoTags.data,
      Slideshow: slideshowTags.data,
      Map: mapTags.data,
      Website: websiteTags.data,
      Document: documentTags.data,
    };

    const data = typeToDataMap[currType || ""];
    if (!data) return [];

    return data
      .filter(({ langCode }: any) =>
        langCode.includes(company?.defaultLangCode ?? "en")
      )
      .map((value: any) => ({
        label: value.tag,
        value: value.tag,
      }));
  };

  const iconPickerContent = (
    <div style={{ width: 320 }}>
      <Input
        placeholder="Search icons..."
        value={iconSearchQuery}
        onChange={(e) => setIconSearchQuery(e.target.value)}
        prefix={<SearchOutlined />}
        style={{ marginBottom: 8 }}
      />
      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 8,
          }}
        >
          {filteredIconKeys.length > 0 ? (
            filteredIconKeys.map((iconName) => (
              <Button
                key={iconName}
                type={selectedIcon === iconName ? "primary" : "default"}
                onClick={() => {
                  setSelectedIcon(iconName);
                  setShowIconPicker(false);
                  setIconSearchQuery("");
                }}
                style={{
                  height: 40,
                  width: 40,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={iconName.replace("Io", "")}
              >
                {renderIcon(iconName, "#000000")}
              </Button>
            ))
          ) : (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "16px 0",
                color: "#999",
              }}
            >
              No icons found
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Card style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <div
            style={{
              fontWeight: 700,
              color: "#9ca3af",
              marginBottom: 16,
              fontSize: 16,
            }}
          >
            Template Shortcuts
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6} lg={6}>
              <Popover
                content={iconPickerContent}
                trigger="click"
                open={showIconPicker}
                onOpenChange={setShowIconPicker}
                placement="bottomLeft"
              >
                <Button
                  block
                  style={{ height: 40 }}
                  onFocus={() => (error ? setError("") : null)}
                >
                  <Space>
                    {renderIcon(selectedIcon, selectedColor)}
                    <span>Select Icon</span>
                  </Space>
                </Button>
              </Popover>
            </Col>

            <Col xs={24} sm={12} md={6} lg={3}>
              <Input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                style={{ height: 40, cursor: "pointer" }}
                title="Select icon color"
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={5}>
              <Select
                placeholder="Select type..."
                style={{ width: "100%" }}
                size="large"
                onFocus={() => (error ? setError("") : null)}
                onChange={(value) => {
                  if (currType !== value) {
                    setTag("");
                  }
                  setType(value as ChatType);
                }}
                value={currType}
                options={[
                  "Text",
                  "Image",
                  "Video",
                  "Slideshow",
                  "Map",
                  "Website",
                  "Document",
                ].map((value) => ({
                  label: value,
                  value: value,
                }))}
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={6}>
              <Select
                placeholder="Select tag..."
                style={{ width: "100%" }}
                size="large"
                onFocus={() => (error ? setError("") : null)}
                onChange={(value) => setTag(value)}
                value={currTag || undefined}
                options={getTagOptions()}
                disabled={!currType}
              />
            </Col>

            <Col xs={24} sm={24} md={24} lg={4}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddLangaugeShortcut}
                style={{ height: 40, width: "100%" }}
                className="customBtn"
              >
                Add
              </Button>
            </Col>
          </Row>
        </div>

        {currShortcuts.length > 0 && (
          <div>
            <Space size={[8, 16]} wrap>
              {currShortcuts.map((res, index) => (
                <Tag
                  key={`${res.icon}-${res.tag}-${index}`}
                  closable
                  onClose={() => {
                    if (error !== "") {
                      setError("");
                    }
                    setCurrShortcuts((prev) =>
                      prev.filter((_, i) => i !== index)
                    );
                  }}
                  style={{
                    padding: "8px 12px",
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  closeIcon={<DeleteOutlined />}
                >
                  <Space>
                    <span title={`${res.type}/${res.tag}`}>
                      {renderIcon(res.icon, res.color)}
                    </span>
                    <span>{res.tag}</span>
                  </Space>
                </Tag>
              ))}
            </Space>
          </div>
        )}

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ textAlign: "center" }}
          />
        )}

        <Button
          type="primary"
          htmlType="submit"
          block
          size="large"
          loading={createShortcutMany.isPending}
          disabled={createShortcutMany.isPending}
          onClick={handleSubmit}
          className="customBtn"
        >
          Save
        </Button>
      </Space>
    </Card>
  );
};