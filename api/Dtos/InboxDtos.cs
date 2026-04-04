namespace RadLeads.Api.Dtos;

public record ThreadMessageDto(string From, string Body, string Time);

public record InboxMessageDto(
    Guid Id,
    string From,
    string Name,
    string Company,
    string Subject,
    string Preview,
    string Time,
    bool Read,
    List<ThreadMessageDto> Thread);

public record IngestReplyRequest(
    Guid SendId,
    string FromAddress,
    string Body,
    DateTimeOffset ReceivedAt);
