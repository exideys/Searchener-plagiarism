using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Texts.Application;
using Texts.Contracts;
using Texts.Infrastructure;

const long maxFileSize = 10 * 1024 * 1024; 

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration["FrontendOrigin"] ?? "http://localhost:5173") 
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()
));

var app = builder.Build();

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();

app.MapPost("/text/analyze", ([FromBody] AnalyzeTextRequest req, ITextService svc) =>
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
            var stats = svc.Extract(req.Text, req.K);
            var counts = stats.Counts.ToDictionary(kv => kv.Key, kv => kv.Value);
            var freqs = stats.Frequencies.ToDictionary(kv => kv.Key, kv => kv.Value);

            return Results.Ok(new ExtractShinglesResponse(stats.Total, counts, freqs));
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
                return Results.Problem(detail: $"File is too large (max {maxFileSize} bytes)", statusCode: StatusCodes.Status413PayloadTooLarge);
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
    .Produces(StatusCodes.Status413PayloadTooLarge)
    .WithOpenApi();

app.MapPost("/file/shingles", async (HttpRequest httpRequest, IAnalyzeFileService svc) =>
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
        
        if (!int.TryParse(form["k"], out var k) || k <= 0)
        {
            return Results.BadRequest(new { error = "A valid 'k' parameter is required." });
        }
        
        if (file.Length is 0 or > maxFileSize)
            return Results.Problem(detail: $"Invalid file size. Max: {maxFileSize} bytes.", statusCode: StatusCodes.Status413PayloadTooLarge);

        try
        {
            await using var stream = file.OpenReadStream();
            
            var stats = await svc.ExecuteShingleAnalysis(stream, file.FileName, k);
            
            var counts = stats.Counts.ToDictionary(kv => kv.Key, kv => kv.Value);
            var freqs = stats.Frequencies.ToDictionary(kv => kv.Key, kv => kv.Value);

            return Results.Ok(new ExtractShinglesResponse(stats.Total, counts, freqs));
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    })
    .WithName("AnalyzeFileShingles")
    .Accepts<IFormFile>("multipart/form-data")
    .Produces<ExtractShinglesResponse>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .Produces(StatusCodes.Status413PayloadTooLarge)
    .WithOpenApi();

app.MapPost("/plagiarism/detect", async ([FromBody] DetectPlagiarismRequest req, IPlagiarismDetectorService svc) =>
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            return Results.BadRequest(new { error = "Text is required" });
        
        var result = await svc.DetectAsync(req.Text, req.ShingleSize, req.SampleStep);
        
        var responseDto = new DetectPlagiarismResponse(
            result.Score,
            result.PotentialSources.Select(s => new SourceMatchDto(s.MatchedShingles, s.Url)).ToList()
        );

        return Results.Ok(responseDto);
    })
    .WithName("DetectPlagiarism")
    .Produces<DetectPlagiarismResponse>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .WithOpenApi();

app.MapPost("/plagiarism/detect/file", async (HttpRequest httpRequest, IAnalyzeFileService fileSvc, IPlagiarismDetectorService plagiarismSvc) =>
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

        if (file.Length is 0 or > maxFileSize)
            return Results.Problem(detail: $"Invalid file size. Max: {maxFileSize} bytes.", statusCode: StatusCodes.Status413PayloadTooLarge);
        
        if (!int.TryParse(form["shingleSize"], out var shingleSize) || shingleSize <= 0)
            return Results.BadRequest(new { error = "A valid 'shingleSize' parameter is required." });
        
        if (!int.TryParse(form["sampleStep"], out var sampleStep))
            return Results.BadRequest(new { error = "A valid 'sampleStep' parameter is required." });
        

        try
        {
            await using var stream = file.OpenReadStream();
            
            var textContent = await fileSvc.ReadAndValidateFileContentAsync(stream, file.FileName);
            
            var result = await plagiarismSvc.DetectAsync(textContent, shingleSize, sampleStep);
            
            var responseDto = new DetectPlagiarismResponse(
                result.Score,
                result.PotentialSources.Select(s => new SourceMatchDto(s.MatchedShingles, s.Url)).ToList()
            );

            return Results.Ok(responseDto);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    })
    .WithName("DetectFilePlagiarism")
    .Accepts<IFormFile>("multipart/form-data")
    .Produces<DetectPlagiarismResponse>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .Produces(StatusCodes.Status413PayloadTooLarge)
    .WithOpenApi();

app.MapPost("/files/compare", async (HttpRequest httpRequest, IAnalyzeFileService fileSvc) =>
{
    var requestSizeFeature = httpRequest.HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>();
    if (requestSizeFeature is not null)
    {
        requestSizeFeature.MaxRequestBodySize = maxFileSize * 2;
    }

    if (!httpRequest.HasFormContentType)
        return Results.BadRequest(new { error = "Expected multipart/form-data" });

    var form = await httpRequest.ReadFormAsync();
    var files = form.Files;

    if (files.Count != 2)
        return Results.BadRequest(new { error = "Exactly two files are required for comparison." });

    var file1 = files[0];
    var file2 = files[1];

    if (file1.Length is 0 or > maxFileSize || file2.Length is 0 or > maxFileSize)
        return Results.Problem(
            detail: $"Invalid file size. Max: {maxFileSize} bytes.",
            statusCode: StatusCodes.Status413PayloadTooLarge
        );
    if (!int.TryParse(form["shingleSize"], out var shingleSize) || shingleSize <= 0)
        return Results.BadRequest(new { error = "A valid 'shingleSize' parameter is required." });
    try
    {
        await using var stream1 = file1.OpenReadStream();
        await using var stream2 = file2.OpenReadStream();

        var result = await fileSvc.CompareTwoFilesAsync(stream1, file1.FileName, stream2, file2.FileName, shingleSize);

        var responseDto = new FileComparisonResult(
            result.SimilarityPercentage,
            result.CommonShingles.Select(cs => new MatchedShingles(cs.MatchedShingle, cs.MatchedFirstFileCount, cs.MatchedSecondFileCount)).ToList(),
            result.TotalFirstTextShingles,
            result.TotalSecondTextShingles,
            result.TotalCommonShingles
        );
        
        return Results.Ok(responseDto);
    }
    catch (ArgumentException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
    .WithName("CompareFiles")
    .Accepts<IFormFile>("multipart/form-data")
    .Produces<FileComparisonResult>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status400BadRequest)
    .Produces(StatusCodes.Status413PayloadTooLarge)
    .WithOpenApi();

app.MapPost("/health", () => Results.Ok(new { status = "Healthy" }))
    .WithName("HealthCheck")
    .Produces(StatusCodes.Status200OK)
    .WithOpenApi();

app.Run();

public partial class Program { }