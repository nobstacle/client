"use client";
import { Row, Col, Card, Spin } from "antd";
import { ColorShortcutForm } from "../../../components/pages/dashboard/Settings/ColorShortcutForm";
import { DefaultSlideshowShortcutForm } from "../../../components/pages/dashboard/Settings/DefaultSlideshowShortcutForm";
import { LanguageShortcutForm } from "../../../components/pages/dashboard/Settings/LanguageShortcutForm";
import { UpdateCompanyUsers } from "../../../components/pages/dashboard/Settings/UpdateCompanyUsers";
import { TemplateMergerForm } from "../../../components/pages/dashboard/Settings/SurveyHeaderText";
import { SurveyEmoticonForm } from "../../../components/pages/dashboard/Settings/SurveyEmoticonForm";
import { useHasHydrated } from "../../../hooks/useHydrated";

export default function SettingsPage() {
  const hasHydrated = useHasHydrated();

  if (!hasHydrated) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100%",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      id="setting-container"
      style={{
        height: "100%",
        width: "100%",
        padding: "24px",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Row gutter={[24, 24]} style={{ height: "100%" }}>
        {/* Left Column - Company Info (Sticky) */}
        <Col xs={24} lg={12} xl={10} style={{ height: "100%" }}>
          <div
            style={{
              position: "sticky",
              top: "24px",
              height: "fit-content",
              maxHeight: "calc(100vh - 48px)",
              overflowY: "auto",
            }}
          >
            <Card
              id="company-info-card"
              bordered
              style={{
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <UpdateCompanyUsers />
            </Card>
          </div>
        </Col>

        {/* Right Column - Shortcuts (Scrollable) */}
        <Col
          xs={24}
          lg={12}
          xl={14}
          style={{
            height: "100%",
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          <Row gutter={[0, 24]}>
            {/* Default Slideshow Shortcut */}
            <Col xs={24}>
              <Card
                bordered
                style={{
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <DefaultSlideshowShortcutForm />
              </Card>
            </Col>

            {/* Language Shortcut */}
            <Col xs={24}>
              <Card
                bordered
                style={{
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <LanguageShortcutForm />
              </Card>
            </Col>

            {/* Color Shortcut */}
            <Col xs={24}>
              <Card
                bordered
                style={{
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <ColorShortcutForm />
              </Card>
            </Col>

            {/* Survey Header */}
            <Col xs={24}>
              <Card
                bordered
                style={{
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <TemplateMergerForm />
              </Card>
            </Col>

            {/* Survey Emoticon */}
            <Col xs={24}>
              <Card
                bordered
                style={{
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <SurveyEmoticonForm />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
}