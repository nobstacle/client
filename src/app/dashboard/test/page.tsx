"use client";

import Modal from "../../../components/Modal";
import TestAudioRecorder from "../../../components/TestAudioRecorder";
import { ErudaContainer } from "../../../components/containers/ErudaContainer";

export default function TestDashboard() {
  return (
    <div>
      <ErudaContainer />
      <TestAudioRecorder />
    </div>
  );
}
