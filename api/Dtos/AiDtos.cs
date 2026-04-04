namespace RadLeads.Api.Dtos;

public record GenerateStepRequest(int StepIndex, int TotalSteps, int Day);
public record GenerateStepResponse(string Subject, string Body);

public record DraftReplyRequest(string SenderName, string LastMessage);
public record DraftReplyResponse(string Body);
