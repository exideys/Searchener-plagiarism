using Texts.Application;
using Texts.Contracts;
using Texts.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddScoped<IAnalyzeFileService, AnalyzeFileService>();
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


app.MapPost("/file/analyze", async (HttpRequest request, IAnalyzeFileService svc)  =>
{
    try
    {
        if (!request.HasFormContentType)
            return Results.BadRequest(new { error = "Invalid content type" });

        var form = await request.ReadFormAsync();
        var file = form.Files.FirstOrDefault();
        using var stream = file.OpenReadStream();
        var s = await svc.Execute(file.OpenReadStream(), file.FileName);
            
        var counts = s.Counts.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value);
        var freqs  = s.Frequencies.ToDictionary(kv => kv.Key.ToString(), kv => kv.Value);
            
        return Results.Ok(new AnalyzeTextResponse(s.Total, counts, freqs));
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (Exception ex)
    {
        return Results.Problem("An error occurred while processing the file");
    }
}).WithName("UploadAndAnalyzeText")
.Produces<AnalyzeTextResponse>(StatusCodes.Status200OK)
.Produces(StatusCodes.Status400BadRequest)
.Produces(StatusCodes.Status500InternalServerError)
.DisableAntiforgery();

app.Run();
public partial class Program { }