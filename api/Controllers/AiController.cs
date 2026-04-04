using Microsoft.AspNetCore.Mvc;
using RadLeads.Api.Dtos;
using RadLeads.Api.Services;

namespace RadLeads.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController(IAiService ai) : ControllerBase
{
    [HttpPost("generate-step")]
    public async Task<IActionResult> GenerateStep(GenerateStepRequest req, CancellationToken ct)
    {
        var result = await ai.GenerateCampaignStepAsync(req.StepIndex, req.TotalSteps, req.Day, ct);
        if (result is null)
            return StatusCode(503, new { error = "AI service unavailable." });
        return Ok(new GenerateStepResponse(result.Subject, result.Body));
    }

    [HttpPost("draft-reply")]
    public async Task<IActionResult> DraftReply(DraftReplyRequest req, CancellationToken ct)
    {
        var body = await ai.DraftReplyAsync(req.SenderName, req.LastMessage, ct);
        if (body is null)
            return StatusCode(503, new { error = "AI service unavailable." });
        return Ok(new DraftReplyResponse(body));
    }
}
