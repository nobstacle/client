import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useQueryClient } from "@tanstack/react-query";
import {
  useShortcutControllerCreateShortcutMany,
  useShortcutControllerPatchShortcut,
  useSlideshowTemplateControllerGetTextTags,
} from "../../../../lib/client/api";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import {
  Card,
  Tooltip,
  Select,
  Button,
  Alert,
  Spin,
  Space,
} from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";

const schema = yup
  .object()
  .shape({
    tag: yup.string().required("Slideshow tag is required"),
  })
  .required();

type FormValues = {
  tag: string;
};

export const DefaultSlideshowShortcutForm: React.FC = () => {
  const queryClient = useQueryClient();
  const { defaulSlideshowShortcut, setDefaultSlideshowShortcut } =
    useShortcutStore();

  const slideshowTags = useSlideshowTemplateControllerGetTextTags();
  const shortcutCreate = useShortcutControllerCreateShortcutMany();
  const shortcutPatch = useShortcutControllerPatchShortcut();

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    control,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { tag: "" },
  });

  const handleDefaultSlideshow = async (data: FormValues) => {
    if (!defaulSlideshowShortcut) {
      shortcutCreate.mutate(
        {
          data: {
            postShortCutReqArray: [
              {
                type: "DefaultSlideshow",
                value: data.tag,
              },
            ],
          },
        },
        {
          onSuccess: (res) => {
            setDefaultSlideshowShortcut(res[0]);
            queryClient.invalidateQueries({ queryKey: ["shortcuts", "all"] });
          },
        }
      );
    } else {
      shortcutPatch.mutate(
        {
          id: defaulSlideshowShortcut.id,
          data: {
            type: "DefaultSlideshow",
            value: data.tag,
          },
        },
        {
          onSuccess: (res) => {
            setDefaultSlideshowShortcut(res);
            queryClient.invalidateQueries({ queryKey: ["shortcuts", "all"] });
          },
        }
      );
    }
  };

  React.useEffect(() => {
    if (defaulSlideshowShortcut?.value) {
      setValue("tag", defaulSlideshowShortcut.value);
    }
  }, [defaulSlideshowShortcut?.value, setValue]);

  const onSubmit: SubmitHandler<FormValues> = (data) =>
    handleDefaultSlideshow(data);

  const hasNoTags = Boolean(slideshowTags.isSuccess && slideshowTags.data?.length === 0);

  const isLoading =
    shortcutCreate.status === "pending" ||
    shortcutPatch.status === "pending" ||
    slideshowTags.isPending;

  return (
    <Card
      className="shadow-sm w-full"
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span className="text-lg font-bold"> Default Slideshow Shortcut</span>
          <Tooltip
            title="Configure a default slideshow template for quick access in the header menu. Users can instantly send the selected slideshow to client screens."
            placement="topRight"
          >
            <InfoCircleOutlined
              style={{
                fontSize: 16,
                color: '#1890ff',
                cursor: 'pointer'
              }}
            />
          </Tooltip>
        </div>
      }
    >
      <Spin spinning={isLoading} tip="Saving...">
        <Space direction="vertical" style={{ width: "100%" }} size="large">

          <div style={{ width: "100%" }}>
            {hasNoTags && (
              <Alert
                message="No slideshow tags available"
                description="Please create a slideshow template and assign a tag to it before configuring the default slideshow shortcut."
                type="info"
                showIcon
                className="mb-4"
              />
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slideshow Tag <span className="text-red-500">*</span>
              </label>
              <Controller
                name="tag"
                control={control}
                render={({ field }) => (
                  <>
                    <Select
                      placeholder={hasNoTags ? "No slideshow tags found" : "Select tag..."}
                      disabled={hasNoTags || isLoading}
                      value={field.value || undefined}
                      onChange={(value) => field.onChange(value)}
                      options={
                        slideshowTags.data?.map((item) => ({
                          value: item.tag,
                          label: item.tag,
                        })) || []
                      }
                      size="large"
                      style={{ width: "100%" }}
                      status={errors.tag ? "error" : ""}
                    />
                    {errors.tag?.message && (
                      <div className="text-red-500 text-sm mt-2">
                        {errors.tag.message.toString()}
                      </div>
                    )}
                  </>
                )}
              />
            </div>

            {shortcutCreate.error?.response?.data.message && (
              <Alert
                message="Error"
                description={
                  typeof shortcutCreate.error.response.data.message === "string"
                    ? shortcutCreate.error.response.data.message.charAt(0).toUpperCase() +
                    shortcutCreate.error.response.data.message.slice(1)
                    : JSON.stringify(shortcutCreate.error.response.data.message)
                }
                type="error"
                showIcon
                closable
                className="mb-4"
              />
            )}

            {shortcutPatch.error?.response?.data.message && (
              <Alert
                message="Error"
                description={
                  typeof shortcutPatch.error.response.data.message === "string"
                    ? shortcutPatch.error.response.data.message.charAt(0).toUpperCase() +
                    shortcutPatch.error.response.data.message.slice(1)
                    : JSON.stringify(shortcutPatch.error.response.data.message)
                }
                type="error"
                showIcon
                closable
                className="mb-4"
              />
            )}

            <Button
              type="primary"
              size="large"
              loading={isLoading}
              disabled={isLoading || hasNoTags}
              block
              onClick={handleSubmit(onSubmit)}
              className="h-10 font-semibold customBtn"
            >
              Save
            </Button>
          </div>
        </Space>
      </Spin>
    </Card>
  );
};