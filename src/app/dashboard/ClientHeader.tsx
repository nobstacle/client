'use client';
import { useCallback, memo } from "react";
import { PropsWithChildren, useState } from "react";
import { Drawer, Button, Input, Tooltip } from "antd";
import { MenuOutlined, CloseOutlined, SettingOutlined, MoreOutlined } from "@ant-design/icons";
import { HeaderLanguagePicker } from "../../components/pages/dashboard/Header/LanguagePicker";
import { LanguageShortcutPicker } from "../../components/pages/dashboard/Header/LanguageShortcutPicker";
import { TemplateShortcutPicker } from "../../components/pages/dashboard/Header/TemplateShortcutPicker";
import { StationPicker } from "../../components/pages/dashboard/Header/StationPicker";
import { ChatBot } from "../../components/pages/dashboard/Header/chatBot";
import { HeaderSurveyShortcut } from "../../components/pages/dashboard/Header/SurveyPicker";
import { HeaderRecordingShortcut } from "../../components/pages/dashboard/Header/SendRecording";

const ClientHeader = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [shortcutMenuOpen, setShortcutMenuOpen] = useState(false);
    const [confirmationNumber, setConfirmationNumber] = useState("");

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

    const handleConfirmationNumberChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setConfirmationNumber(e.target.value);
        },
        []
    );

    const clearConfirmationNumber = useCallback(() => {
        setConfirmationNumber("");
    }, []);

    return (
        <>
            {/* Mobile Header */}
            <div className="block lg:hidden" style={{ backgroundColor: '#3b5998' }}>
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
                        {/* Action Buttons */}
                        {/* <div className="" style={{ padding: '0.2rem', paddingLeft: '0.5rem' }}>
                            <HeaderRecordingShortcut confirmationNumber={confirmationNumber} clearConfirmationNumber={clearConfirmationNumber} />
                        </div> */}
                        <div className="" style={{ padding: '0.2rem' }}>
                            <HeaderSurveyShortcut confirmationNumber={confirmationNumber} clearConfirmationNumber={clearConfirmationNumber} />
                        </div>
                        <div className="rounded-lg" style={{ padding: '0.2rem' }}>
                            <ChatBot />
                        </div>
                        {/* Shared Confirmation Number Input */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1">
                            <Input
                                placeholder="ID# or Search Template"
                                value={confirmationNumber}
                                onChange={handleConfirmationNumberChange}
                                className="bg-transparent border-none text-white placeholder-white/60 customInputBox"
                                style={{
                                    width: '190px',
                                    color: 'white',
                                }}
                                suffix={
                                    <CloseOutlined
                                        className={`transition-opacity ${confirmationNumber
                                            ? 'opacity-100 cursor-pointer'
                                            : 'opacity-0 pointer-events-none'
                                            } text-white/60 hover:text-white text-xs`}
                                        onClick={clearConfirmationNumber}
                                    />
                                }
                            />
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

            {/* Shortcut Menu Drawer - Mobile */}
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
                    {/* Shared Input in Mobile Drawer */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Confirmation Number</h3>
                        <Input
                            placeholder="Enter confirmation number"
                            value={confirmationNumber}
                            onChange={handleConfirmationNumberChange}
                            size="large"
                            suffix={
                                confirmationNumber && (
                                    <CloseOutlined
                                        className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                        onClick={clearConfirmationNumber}
                                    />
                                )
                            }
                        />
                    </div>

                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="text-base font-semibold text-gray-800 mb-3">Quick Actions</h3>
                        <div className="flex gap-2">
                            <HeaderSurveyShortcut confirmationNumber={confirmationNumber} clearConfirmationNumber={clearConfirmationNumber} />
                        </div>
                    </div>

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