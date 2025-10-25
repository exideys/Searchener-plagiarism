using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Texts.Application;
using Texts.Contracts;
using Texts.Infrastructure;

const long maxFileSize = 10 * 1024 * 1024; 

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddApplication();
builder.Services.AddInfrastructure();


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("http://localhost:5173")
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
));

var app = builder.Build();

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();

app.MapPost(
    "/text/analyze",
    ([FromBody] AnalyzeTextRequest req, ITextService svc) =>
    {
        try
        {
            
            
            if (string.IsNullOrWhiteSpace(req.Text))
                return Results.BadRequest(new { error = "Text is required" });

            var stats = svc.Analyze(req.Text);

            
            var counts = stats.Counts.ToDictionary(kv => kv.Key, kv => kv.Value);
            var freqs = stats.Frequencies.ToDictionary(kv => kv.Key, kv => kv.Value);

            return Results.Ok(new AnalyzeTextResponse(
                stats.Total,
                counts,
                freqs
            ));
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    })
    .WithName("AnalyzeText")
    .Produces<AnalyzeTextResponse>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .WithOpenApi();

app.MapPost("/text/shingles", ([FromBody] ExtractShinglesRequest req, IShingleService svc) =>
    {
        try
        {
            var shingles = svc.Extract(req.Text, req.K);
            return Results.Ok(new ExtractShinglesResponse(shingles));
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    })
    .WithName("ExtractShingles")
    .Produces<ExtractShinglesResponse>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .WithOpenApi();

app.MapPost("/file/analyze", async (HttpRequest httpRequest, IAnalyzeFileService svc) =>
    {
        var requestSizeFeature = httpRequest.HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (requestSizeFeature is not null)
        {
            requestSizeFeature.MaxRequestBodySize = maxFileSize;
        }

        if (!httpRequest.HasFormContentType)
            return Results.BadRequest(new { error = "Expected multipart/form-data" });

        var form = await httpRequest.ReadFormAsync();
        var file = form.Files.FirstOrDefault();

        if (file is null)
            return Results.BadRequest(new { error = "File is required" });

        switch (file.Length)
        {
            case 0:
                return Results.BadRequest(new { error = "Empty file" });
            case > maxFileSize:
                return Results.BadRequest(new { error = $"File is too large (max {maxFileSize} bytes)" });
            default:
                try
                {
                    await using var stream = file.OpenReadStream();

                    var stats = await svc.Execute(stream, file.FileName);

                    var counts = stats.Counts.ToDictionary(kv => kv.Key, kv => kv.Value);
                    var freqs = stats.Frequencies.ToDictionary(kv => kv.Key, kv => kv.Value);

                    return Results.Ok(new AnalyzeTextResponse(
                        stats.Total,
                        counts,
                        freqs
                    ));
                }
                catch (ArgumentException ex)
                {
                    return Results.BadRequest(new { error = ex.Message });
                }
        }
    })
    .WithName("AnalyzeFile")
    .Accepts<IFormFile>("multipart/form-data")
    .Produces<AnalyzeTextResponse>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .WithOpenApi();

app.Run();

public partial class Program { }