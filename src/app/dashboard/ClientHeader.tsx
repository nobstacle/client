'use client';

import { PropsWithChildren, useState } from "react";
import { Drawer, Button, Divider } from "antd";
import { MenuOutlined, CloseOutlined, SettingOutlined, MoreOutlined } from "@ant-design/icons";
import { HeaderLanguagePicker } from "../../components/pages/dashboard/Header/LanguagePicker";
import { LanguageShortcutPicker } from "../../components/pages/dashboard/Header/LanguageShortcutPicker";
import { TemplateShortcutPicker } from "../../components/pages/dashboard/Header/TemplateShortcutPicker";
import { StationPicker } from "../../components/pages/dashboard/Header/StationPicker";
import { ChatBot } from "../../components/pages/dashboard/Header/chatBot";

const ClientHeader = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [shortcutMenuOpen, setShortcutMenuOpen] = useState(false);

    const showDrawer = () => {
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
    };

    const showShortcutMenu = () => {
        setShortcutMenuOpen(true);
    };

    const closeShortcutMenu = () => {
        setShortcutMenuOpen(false);
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="block lg:hidden" style={{ backgroundColor: '#3b5998' }}>
                {/* First Line: Main Menu (Left) - Shortcut Menu (Right) */}
                <nav className="h-14 w-full shadow-sm border-b border-white/20 px-4">
                    <div className="flex h-full w-full items-center justify-between">
                        <Button
                            type="text"
                            icon={<MenuOutlined className="text-white text-xl" />}
                            onClick={showDrawer}
                            className="border-none shadow-none hover:bg-white/20 transition-colors duration-200 rounded-lg p-3"
                            style={{
                                background: 'transparent',
                                border: 'none'
                            }}
                        />
                        <Button
                            type="text"
                            icon={<MoreOutlined className="text-white text-xl" size={30} />}
                            onClick={showShortcutMenu}
                            className="border-none shadow-none hover:bg-white/20 transition-colors duration-200 rounded-lg p-3 customQuickActionButton"
                            style={{
                                background: 'transparent',
                                border: 'none'
                            }}
                        />
                    </div>
                </nav>

                {/* Second Line: Language Radio Buttons (Left) - Station Dropdown (Right) */}
                {/* <div className="h-12 w-full px-4 py-2 border-b border-gray-100">
                    <div className="flex h-full w-full items-center justify-between">
                        <div className="flex-1">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1 inline-block">
                                <LanguageShortcutPicker />
                            </div>
                        </div>
                        <div className="ml-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1">
                                <StationPicker />
                            </div>
                        </div>
                    </div>
                </div> */}
            </div>

            {/* Desktop Header */}
            <nav className="h-20 w-full shadow-sm border-b border-gray-100 px-6 hidden lg:block"
                style={{ backgroundColor: '#3b5998' }}>
                <div className="flex h-full w-full items-center justify-between mx-auto">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                <LanguageShortcutPicker />
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                <HeaderLanguagePicker />
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                                <TemplateShortcutPicker />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg" style={{ padding: '0.2rem', marginRight: '1rem' }}>
                            <ChatBot />
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                            <StationPicker />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Menu Drawer */}
            <Drawer
                title={
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <SettingOutlined className="text-white text-lg" />
                            <span className="text-lg font-semibold text-white">Settings</span>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined className="text-white" />}
                            onClick={closeDrawer}
                            className="border-none shadow-none hover:bg-white/20 rounded-lg"
                            style={{ background: 'transparent' }}
                        />
                    </div>
                }
                placement="top"
                closable={false}
                onClose={closeDrawer}
                open={drawerOpen}
                height="auto"
                className="block lg:hidden"
                bodyStyle={{
                    padding: '24px',
                    backgroundColor: '#f8fafc',
                    minHeight: 'calc(100vh - 120px)'
                }}
                headerStyle={{
                    backgroundColor: '#3b5998',
                    color: 'white',
                    borderBottom: 'none',
                    padding: '16px 24px'
                }}
            >
                <div className="space-y-6">
                    {/* Language Section */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b5998' }}></div>
                            <h3 className="text-base font-semibold text-gray-800">Language Settings</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 block">Language Shortcut</label>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <LanguageShortcutPicker />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 block">Language</label>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <HeaderLanguagePicker />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Template Section */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b5998' }}></div>
                            <h3 className="text-base font-semibold text-gray-800">Template Settings</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600 block">Template Shortcut</label>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <TemplateShortcutPicker />
                            </div>
                        </div>
                    </div>

                    {/* Station Section */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3b5998' }}></div>
                            <h3 className="text-base font-semibold text-gray-800">Station Settings</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-600 block">Station</label>
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <StationPicker />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-6 space-y-3">
                        <Button
                            type="primary"
                            onClick={closeDrawer}
                            className="w-full h-12 text-base font-semibold rounded-xl shadow-sm"
                            style={{
                                backgroundColor: '#3b5998',
                                borderColor: '#3b5998',
                                color: 'white'
                            }}
                        >
                            Apply Settings
                        </Button>
                        <Button
                            onClick={closeDrawer}
                            className="w-full h-12 text-base font-medium rounded-xl border-2 text-gray-600 hover:bg-gray-50"
                            style={{
                                borderColor: '#e5e7eb',
                                background: 'white'
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Drawer>

            {/* Shortcut Menu Drawer */}
            <Drawer
                title={
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                            <MoreOutlined className="text-white text-lg" />
                            <span className="text-lg font-semibold text-white">Quick Actions</span>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined className="text-white" />}
                            onClick={closeShortcutMenu}
                            className="border-none shadow-none hover:bg-white/20 rounded-lg"
                            style={{ background: 'transparent' }}
                        />
                    </div>
                }
                placement="right"
                closable={false}
                onClose={closeShortcutMenu}
                open={shortcutMenuOpen}
                width={300}
                className="block lg:hidden"
                bodyStyle={{
                    padding: '24px',
                    backgroundColor: '#f8fafc'
                }}
                headerStyle={{
                    backgroundColor: '#3b5998',
                    color: 'white',
                    borderBottom: 'none',
                    padding: '16px 24px'
                }}
            >
                <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Language Shortcut Picker</h3>
                        <LanguageShortcutPicker />
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Language</h3>
                        <HeaderLanguagePicker />
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Template Shortcut</h3>
                        <TemplateShortcutPicker />
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Station Picker</h3>
                        <StationPicker />
                    </div>
                </div>
            </Drawer>
        </>
    );
};

export default ClientHeader;