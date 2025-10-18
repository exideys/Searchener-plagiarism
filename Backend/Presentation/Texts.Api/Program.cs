using Texts.Application;
using Texts.Contracts;
using Texts.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("http://localhost:5173")
    .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();

app.MapPost("/text/analyze", (AnalyzeTextRequest req, ITextService svc) =>
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            return Results.BadRequest(new { error = "Text is required" });

        var s = svc.Analyze(req.Text);
        var counts = s.Counts.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value);
        var freqs  = s.Frequencies.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value);
        return Results.Ok(new AnalyzeTextResponse(s.Total, counts, freqs));
    })
    .WithName("AnalyzeText")
    .Produces<AnalyzeTextResponse>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest);

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

public partial class Program { }