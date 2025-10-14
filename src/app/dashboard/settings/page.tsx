"use client";
import { Row, Col, Card, Spin } from "antd";
import { ColorShortcutForm } from "../../../components/pages/dashboard/Settings/ColorShortcutForm";
import { DefaultSlideshowShortcutForm } from "../../../components/pages/dashboard/Settings/DefaultSlideshowShortcutForm";
import { LanguageShortcutForm } from "../../../components/pages/dashboard/Settings/LanguageShortcutForm";
import { UpdateCompanyUsers } from "../../../components/pages/dashboard/Settings/UpdateCompanyUsers";
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
        overflowY: "auto",
        padding: "24px",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Row gutter={[24, 24]}>
        {/* Left Column - Company Info */}
        <Col xs={24} lg={12} xl={10}>
          <Card
            id="company-info-card"
            bordered
            style={{
              height: "100%",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <UpdateCompanyUsers />
          </Card>
        </Col>

        {/* Right Column - Shortcuts */}
        <Col xs={24} lg={12} xl={14}>
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
          </Row>
        </Col>
      </Row>
    </div>
  );
}