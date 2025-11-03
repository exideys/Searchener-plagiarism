using Xunit;
using System.Net;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using FluentAssertions;
using Texts.Contracts;
using Texts.Infrastructure;

namespace Texts.Api.Tests;

public class PlagiarismApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public PlagiarismApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task DetectPlagiarism_WithMockedClient_ShouldReturnOkAndPredictableResult()
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
        
        var request = new DetectPlagiarismRequest("This sentence is a test.", 4, 1);
        
        var response = await client.PostAsJsonAsync("/plagiarism/detect", request);
        
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<DetectPlagiarismResponse>();
    
        dto.Should().NotBeNull();
        dto!.Score.Should().Be(1.0);
        dto.PotentialSources.First().Url.Should().Be("http://mocked-url.com/found");
    }
    
    [Fact]
    public async Task DetectFilePlagiarism_WithMockedClientAndValidFile_ShouldReturnOkAndCorrectResult()
    {
        var googleClientMock = new Mock<IGoogleSearchClient>();
        googleClientMock.Setup(c => c.FindFirstMatchUrlAsync("this is a")).ReturnsAsync("http://mocked.com/found");
        googleClientMock.Setup(c => c.FindFirstMatchUrlAsync("is a test")).ReturnsAsync((string?)null); 

        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddScoped<IGoogleSearchClient>(_ => googleClientMock.Object);
            });
        }).CreateClient();
        
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("This is a test file")), "file", "test.txt");
        form.Add(new StringContent("3"), "shingleSize");
        form.Add(new StringContent("1"), "sampleStep");
        
        var response = await client.PostAsync("/plagiarism/detect/file", form);
        
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<DetectPlagiarismResponse>();
        
        dto.Should().NotBeNull();
        dto!.Score.Should().BeApproximately(0.333, 0.01);
        dto.PotentialSources.Should().ContainSingle()
           .Which.Url.Should().Be("http://mocked.com/found");
    }
}