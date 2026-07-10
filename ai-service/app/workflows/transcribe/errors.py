class TranscribeWorkflowError(Exception):
    pass


class UnsupportedAsrStrategyError(TranscribeWorkflowError):
    def __init__(self, asr_strategy: str) -> None:
        self.asr_strategy = asr_strategy
        super().__init__(f"unsupported ASR strategy: {asr_strategy}")


class InvalidTranscribeResultError(TranscribeWorkflowError):
    pass
