import * as React from "react";

import { SModalContainer, SModalTitle } from "./shared";

interface PingModalProps {
  result: any;
}

const ChainSwitchModal = (props: PingModalProps) => {
  const { result } = props;
  return result ? (
    <SModalContainer>
      <SModalTitle>❌ {result}</SModalTitle>
    </SModalContainer>
  ) : null;
};

export default ChainSwitchModal;
