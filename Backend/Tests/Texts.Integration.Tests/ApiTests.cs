using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Texts.Contracts;
using Xunit;

public class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

    public ApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AnalyzeText_ValidText_Returns200AndCorrectStats()
    {
        var request = new AnalyzeTextRequest("aa bb aa");

        var response = await _client.PostAsJsonAsync("/text/analyze", request);

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
        var request = new AnalyzeTextRequest(" ");

        var response = await _client.PostAsJsonAsync("/text/analyze", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ExtractShingles_ValidRequest_Returns200AndShingleStats()
    {
        var request = new ExtractShinglesRequest("one two three one two", 2);

        var response = await _client.PostAsJsonAsync("/text/shingles", request);

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
        var request = new ExtractShinglesRequest("some text", 0);

        var response = await _client.PostAsJsonAsync("/text/shingles", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AnalyzeFile_TooLarge_Returns400BadRequest()
    {
        using var content = new MultipartFormDataContent();
        var bigFile = new byte[10 * 1024 * 1024 + 1];
        content.Add(new ByteArrayContent(bigFile), "file", "big.txt");

        var response = await _client.PostAsync("/file/analyze", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AnalyzeFile_UnsupportedExtension_Returns400()
    {
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("hello")), "file", "data.bin");

        var response = await _client.PostAsync("/file/analyze", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AnalyzeFile_ValidFile_Returns200AndCorrectStats()
    {
        using var form = new MultipartFormDataContent();
        var bytes = Encoding.UTF8.GetBytes("a b a");
        form.Add(new ByteArrayContent(bytes), "file", "note.txt");

        var response = await _client.PostAsync("/file/analyze", form);

        response.EnsureSuccessStatusCode();
        var dto = await response.Content.ReadFromJsonAsync<AnalyzeTextResponse>(_jsonOptions);

        Assert.NotNull(dto);
        Assert.Equal(3, dto.Total);
        Assert.Equal(2, dto.Counts["a"]);
        Assert.Equal(1, dto.Counts["b"]);
    }



    [Fact]
    public async Task AnalyzeFile_NotMultipart_Returns400()
    {
        var bytes = new ByteArrayContent(Encoding.UTF8.GetBytes("hello"));

        var response = await _client.PostAsync("/file/analyze", bytes);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}