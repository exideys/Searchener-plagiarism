using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Texts.Contracts;
using Texts.Infrastructure;
using Xunit;

public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public ApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task AnalyzeText_ValidText_Returns200AndCorrectStats()
    {
        var client = _factory.CreateClient();
        var request = new AnalyzeTextRequest("aa bb aa");
        
        var response = await client.PostAsJsonAsync("/text/analyze", request);
        
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<AnalyzeTextResponse>(_jsonOptions);

        Assert.NotNull(dto);
        Assert.Equal(3, dto.Total);
        Assert.Equal(2, dto.Counts["aa"]);
        Assert.Equal(1, dto.Counts["bb"]);
        Assert.InRange(dto.Frequencies.Values.Sum(), 0.999, 1.001);
    }

    [Fact]
    public async Task AnalyzeText_EmptyText_Returns400()
    {
        var client = _factory.CreateClient();
        var request = new AnalyzeTextRequest(" ");
        
        var response = await client.PostAsJsonAsync("/text/analyze", request);
        
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ExtractShingles_ValidRequest_Returns200AndShingleStats()
    {
        var client = _factory.CreateClient();
        var request = new ExtractShinglesRequest("one two three one two", 2);
        
        var response = await client.PostAsJsonAsync("/text/shingles", request);
        
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<ExtractShinglesResponse>(_jsonOptions);

        Assert.NotNull(dto);
        Assert.Equal(4, dto.Total);
        Assert.Equal(2, dto.Counts["one two"]);
        Assert.Equal(1, dto.Counts["two three"]);
        Assert.Equal(0.5, dto.Frequencies["one two"]);
    }

    [Fact]
    public async Task ExtractShingles_InvalidK_Returns400()
    {
        var client = _factory.CreateClient();
        var request = new ExtractShinglesRequest("some text", 0);
        
        var response = await client.PostAsJsonAsync("/text/shingles", request);
        
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
    
    [Fact]
    public async Task AnalyzeFile_ValidFile_Returns200AndCorrectStats()
    {
        var client = _factory.CreateClient();
        using var form = new MultipartFormDataContent();
        var bytes = Encoding.UTF8.GetBytes("a b a");
        form.Add(new ByteArrayContent(bytes), "file", "note.txt");
        
        var response = await client.PostAsync("/file/analyze", form);
        
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<AnalyzeTextResponse>(_jsonOptions);

        Assert.NotNull(dto);
        Assert.Equal(3, dto.Total);
        Assert.Equal(2, dto.Counts["a"]);
        Assert.Equal(1, dto.Counts["b"]);
    }
    
    [Fact]
    public async Task AnalyzeFileShingles_ValidFile_Returns200AndCorrectStats()
    {
        var client = _factory.CreateClient();
        using var form = new MultipartFormDataContent();
        var bytes = Encoding.UTF8.GetBytes("a b c a b");
        form.Add(new ByteArrayContent(bytes), "file", "note.txt");
        form.Add(new StringContent("2"), "k");
        
        var response = await client.PostAsync("/file/shingles", form);
        
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<ExtractShinglesResponse>(_jsonOptions);
        
        Assert.NotNull(dto);
        Assert.Equal(4, dto.Total);
        Assert.Equal(2, dto.Counts["a b"]);
    }

    [Fact]
    public async Task AnalyzeFile_NotMultipart_Returns400()
    {
        var client = _factory.CreateClient();
        var bytes = new ByteArrayContent(Encoding.UTF8.GetBytes("hello"));
        
        var response = await client.PostAsync("/file/analyze", bytes);
        
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DetectPlagiarism_WithMockedClient_Returns200AndPredictableResult()
    {
        var googleClientMock = new Mock<IGoogleSearchClient>();
        googleClientMock
            .Setup(c => c.FindFirstMatchUrlAsync(It.IsAny<string>()))
            .ReturnsAsync("http://mocked-url.com/found");
        
        var client = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddScoped<IGoogleSearchClient>(_ => googleClientMock.Object);
                });
            })
            .CreateClient();
        
        var request = new DetectPlagiarismRequest("This sentence is a test for plagiarism detection.", 5, 1);
        
        var response = await client.PostAsJsonAsync("/plagiarism/detect", request);
        
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<DetectPlagiarismResponse>(_jsonOptions);
    
        Assert.NotNull(dto);
        Assert.Equal(1.0, dto.Score);
        Assert.NotNull(dto.PotentialSources);
        Assert.Equal("http://mocked-url.com/found", dto.PotentialSources.First().Url);
    }
    
    [Fact]
    public async Task DetectFilePlagiarism_ValidFile_Returns200AndCorrectResult()
    {
        var googleClientMock = new Mock<IGoogleSearchClient>();
        googleClientMock
            .Setup(c => c.FindFirstMatchUrlAsync("this is a"))
            .ReturnsAsync("http://mocked-url.com/found");
        googleClientMock
            .Setup(c => c.FindFirstMatchUrlAsync("is a test"))
            .ReturnsAsync((string?)null); // Мокируем один промах

        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddScoped<IGoogleSearchClient>(_ => googleClientMock.Object);
            });
        }).CreateClient();
        
        using var form = new MultipartFormDataContent();
        var bytes = Encoding.UTF8.GetBytes("This is a test file");
        form.Add(new ByteArrayContent(bytes), "file", "test.txt");
        form.Add(new StringContent("3"), "shingleSize");
        form.Add(new StringContent("1"), "sampleStep");
        
        var response = await client.PostAsync("/plagiarism/detect/file", form);
        
        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<DetectPlagiarismResponse>(_jsonOptions);
        
        Assert.NotNull(dto);
        Assert.InRange(dto.Score, 0.33, 0.34);
        Assert.Single(dto.PotentialSources);
        Assert.Equal("http://mocked-url.com/found", dto.PotentialSources.First().Url);
    }
}