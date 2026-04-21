using RadLeads.Api.Models;

namespace RadLeads.Api.Services;

// Fixed 7-touch outbound cadence. Day offsets from Day 0 (first touch).
// Day:  0   2   4   7   11  18  30
// Touch: 1   2   3   4   5   6   7
public static class CadenceService
{
    public static readonly int[] CadenceDays = [0, 2, 4, 7, 11, 18, 30];

    // Advance a company's cadence state based on a just-logged outcome.
    // Terminal outcomes (Interested/NotInterested/WrongNumber) stop the cadence and set a disposition.
    // CallBack pauses the cadence at the current touch and pins NextTouchAt to the caller-provided datetime.
    // Everything else advances to the next touch (or completes if we've exhausted all 7 touches).
    public static void Advance(Company company, CallOutcome outcome, DateTimeOffset? callbackAt, DateTimeOffset now)
    {
        // Postgres timestamptz requires UTC; guard against non-UTC callers
        var callbackUtc = callbackAt?.ToUniversalTime();

        // First time this lead is touched: anchor Day 0
        company.CadenceStartedAt ??= now;
        if (company.CurrentTouchNumber == 0) company.CurrentTouchNumber = 1;

        switch (outcome)
        {
            case CallOutcome.NotInterested:
                company.CadenceStatus   = CadenceStatus.Dropped;
                company.DialDisposition = DialDisposition.NotInterested;
                company.NextTouchAt     = null;
                return;

            case CallOutcome.WrongNumber:
                company.CadenceStatus   = CadenceStatus.Dropped;
                company.DialDisposition = DialDisposition.BadNumber;
                company.NextTouchAt     = null;
                return;

            case CallOutcome.Interested:
                company.CadenceStatus   = CadenceStatus.Completed;
                company.DialDisposition = DialDisposition.Converted;
                company.NextTouchAt     = null;
                return;

            case CallOutcome.CallBack:
                company.CadenceStatus = CadenceStatus.Paused;
                company.NextTouchAt   = callbackUtc ?? now.AddDays(1);
                return;

            default:
                AdvanceToNextTouch(company, now, callbackUtc);
                return;
        }
    }

    // Non-terminal outcomes (Connected/LeftVoicemail/LeftMessage/NoAnswer) advance the touch counter.
    // If the user supplied a callback time, it overrides the cadence-default gap.
    static void AdvanceToNextTouch(Company company, DateTimeOffset now, DateTimeOffset? callbackUtc)
    {
        var next = company.CurrentTouchNumber + 1;
        if (next > CadenceDays.Length)
        {
            company.CadenceStatus = CadenceStatus.Completed;
            company.NextTouchAt   = null;
            return;
        }
        var gapDays = CadenceDays[next - 1] - CadenceDays[company.CurrentTouchNumber - 1];
        company.CurrentTouchNumber = next;
        company.CadenceStatus      = CadenceStatus.Active;
        company.NextTouchAt        = callbackUtc ?? now.AddDays(gapDays);
    }
}
