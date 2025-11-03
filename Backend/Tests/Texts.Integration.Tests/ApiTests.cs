using Xunit;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Texts.Contracts;

namespace Texts.Api.Tests;

public class TextApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public TextApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AnalyzeText_WithValidText_ShouldReturnOkAndCorrectStats()
    {
        var request = new AnalyzeTextRequest("aa bb aa");
        
        var response = await _client.PostAsJsonAsync("/text/analyze", request);
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<AnalyzeTextResponse>();

        Assert.NotNull(dto);
        Assert.Equal(3, dto!.Total);
        Assert.Contains(new KeyValuePair<string, int>("aa", 2), dto.Counts);
        Assert.Equal(2, dto.Counts["aa"]);
    }

    [Fact]
    public async Task AnalyzeText_WithWhitespaceText_ShouldReturnBadRequest()
    {
        var request = new AnalyzeTextRequest(" ");
        var response = await _client.PostAsJsonAsync("/text/analyze", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ExtractShingles_WithValidRequest_ShouldReturnOkAndShingleStats()
    {
        var request = new ExtractShinglesRequest("one two three one two", 2);
        var response = await _client.PostAsJsonAsync("/text/shingles", request);
        
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<ExtractShinglesResponse>();

        Assert.NotNull(dto);
        Assert.Equal(4, dto!.Total);
        Assert.Contains("one two", dto.Counts);
        Assert.Equal(2, dto.Counts["one two"]);
        Assert.Equal(0.5, dto.Frequencies["one two"]);
    }

    [Fact]
    public async Task ExtractShingles_WithInvalidK_ShouldReturnBadRequest()
    {
        var request = new ExtractShinglesRequest("some text", 0);
        var response = await _client.PostAsJsonAsync("/text/shingles", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}